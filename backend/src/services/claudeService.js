// ============================================================
// src/services/claudeService.js
//
// AI triage engine powered by Google Gemini.
// (File name kept as claudeService.js to avoid breaking imports)
//
// Two public functions:
//
//   1. triageReport(rawText)
//      → Classifies, scores, and extracts structure from any
//        raw community-need message (WhatsApp, SMS, web, voice).
//
//   2. translateAndClean(rawText, targetLanguage)
//      → Translates non-English input to English and cleans
//        informal WhatsApp/SMS shorthand into proper sentences.
//
// Both functions degrade gracefully — a Gemini API failure
// never breaks the intake pipeline.
// ============================================================

const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPTS
// ─────────────────────────────────────────────────────────────

const TRIAGE_SYSTEM_PROMPT = `You are a humanitarian triage assistant for CommunityPulse, an NGO volunteer coordination platform operating in India.

Your job: analyse a raw community-need report and return ONLY valid JSON — no markdown fences, no explanation, no extra text.

Respond with exactly this JSON shape:
{
  "category": "<one of: food | medical | shelter | education | water | safety | mental_health | other>",
  "description": "<clean, 1-2 sentence English summary of the need>",
  "urgency_score": <integer 0-100>,
  "vulnerability_flags": ["<flag>"],
  "location_text": "<extracted location string from the message, or null if none found>",
  "is_duplicate_hint": <true if the message sounds like a repeated/follow-up report, false otherwise>,
  "language_detected": "<two-letter code: en | hi | ta | te | bn | mr | kn | ml | gu | pa | other>",
  "native_reply_message": "<A short confirmation message in the EXACT SAME language the user texted in. Format: 'Thank you! Your report has been received and triaged as {CATEGORY}. Reference ID: {ID}'. Translate this to their language!>"
}

─── URGENCY SCORING GUIDE ───
90-100  Life-threatening — medical emergency, no food for 2+ days, structurally unsafe shelter, active abuse/violence
70-89   Urgent — non-critical medical issue, family with children has no food, elderly person living alone with no support
50-69   Serious — recurring/worsening need, group of people affected, situation deteriorating over days
30-49   Moderate — important but not immediate, affects 1-2 people moderately, partial support already present
 0-29   Minor — informational, follow-up inquiry, already partially addressed, general question

─── VULNERABILITY FLAGS (use all that apply) ───
"elderly"   — involves a person aged 60+
"child"     — involves a minor under 18
"disabled"  — involves a person with physical or mental disability
"pregnant"  — involves a pregnant woman
"alone"     — the affected person is isolated with no family/neighbour support

─── DUPLICATE DETECTION ───
Set is_duplicate_hint to true if the message contains phrases like:
"I already reported", "calling again", "still waiting", "no one came",
"same problem", "follow up", or similar re-report indicators.

─── EDGE CASES ───
• If the message is not a need report (spam, greeting, test), return:
  { "category": "other", "description": "Not a community need report", "urgency_score": 0, "vulnerability_flags": [], "location_text": null, "is_duplicate_hint": false, "language_detected": "en" }
• If you are unsure about the category, default to "other".
• If you are unsure about urgency, bias toward HIGHER (safety first).
• Always attempt to extract a location even from vague hints ("near the temple", "behind the bus stand").`;

const TRANSLATE_SYSTEM_PROMPT = `You are a multilingual text cleaner for CommunityPulse, an NGO platform in India.

Your job: take a raw message (possibly in Hindi, Tamil, Telugu, Bengali, or mixed Hinglish/regional language with English) and return ONLY a clean JSON object — no markdown, no explanation.

Respond with exactly this JSON shape:
{
  "original_language": "<two-letter code: en | hi | ta | te | bn | mr | kn | ml | gu | pa | other>",
  "cleaned_text": "<the message translated to the target language, with informal abbreviations expanded into proper words>",
  "confidence": <float 0.0-1.0 indicating translation confidence>
}

─── CLEANING RULES ───
• Expand common WhatsApp/SMS abbreviations:
  "pls/plz" → "please", "u" → "you", "r" → "are", "abt" → "about",
  "govt" → "government", "hosp" → "hospital", "tmrw" → "tomorrow",
  "asap" → "as soon as possible", "sm1" → "someone", "b4" → "before",
  "2day" → "today", "msg" → "message", "thx/ty" → "thank you"
• Fix broken grammar into readable English sentences.
• Preserve all names, phone numbers, addresses, and quantities exactly as written.
• If the text is already clean English, return it unchanged with confidence 1.0.
• Do NOT add information that is not present in the original message.`;

// ─────────────────────────────────────────────────────────────
// HELPER: safely extract JSON from Gemini's response
// ─────────────────────────────────────────────────────────────

/**
 * Extract and parse JSON from a Gemini API response string.
 * Handles the case where Gemini wraps output in ```json fences
 * despite being told not to.
 *
 * @param {string} text - raw text from Gemini response
 * @returns {Object} parsed JSON object
 * @throws {Error} if JSON is invalid
 */
const extractJSON = (text) => {
  let raw = text.trim();

  // Strip markdown code fences if Gemini added them
  raw = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```$/i, '');

  // Attempt to parse
  try {
    return JSON.parse(raw);
  } catch (parseErr) {
    // Last-resort: try to find a JSON object in the string
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error(`Failed to parse Gemini response as JSON: ${parseErr.message}`);
  }
};

// ─────────────────────────────────────────────────────────────
// FUNCTION 1: triageReport
// ─────────────────────────────────────────────────────────────

/**
 * Send a raw community-need message to Gemini for AI triage.
 *
 * @param {string} rawText - the original message exactly as received
 * @param {string} [sourceChannel='web_form'] - intake channel for context
 * @returns {Object} triage result conforming to the documented JSON shape
 */
const triageReport = async (rawText, sourceChannel = 'web_form') => {
  // ── Guard: empty input ──────────────────────────────────────
  if (!rawText || rawText.trim().length === 0) {
    return buildFallbackTriage('', 'Empty input received');
  }

  try {
    // ── Call Gemini ───────────────────────────────────────────
    const prompt = [
      TRIAGE_SYSTEM_PROMPT,
      '',
      `Source channel: ${sourceChannel}`,
      `Raw message:`,
      rawText,
    ].join('\n');

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // ── Parse the JSON response ─────────────────────────────
    const parsed = extractJSON(text);

    // ── Validate required fields ────────────────────────────
    if (parsed.urgency_score === undefined || !parsed.category) {
      throw new Error(
        'Gemini response missing required fields (category or urgency_score)'
      );
    }

    // ── Normalise & clamp values ────────────────────────────
    const VALID_CATEGORIES = [
      'food', 'medical', 'shelter', 'education',
      'water', 'safety', 'mental_health', 'other',
    ];
    const category = VALID_CATEGORIES.includes(parsed.category)
      ? parsed.category
      : 'other';

    // Clamp urgency to 0–100 integer
    const urgency_score = Math.min(
      Math.max(Math.round(Number(parsed.urgency_score) || 0), 0),
      100
    );

    // Ensure vulnerability_flags is always a string array
    const VALID_FLAGS = ['elderly', 'child', 'disabled', 'pregnant', 'alone'];
    const vulnerability_flags = Array.isArray(parsed.vulnerability_flags)
      ? parsed.vulnerability_flags.filter((f) => VALID_FLAGS.includes(f))
      : [];

    // Boolean fields — coerce to true/false
    const is_duplicate_hint = parsed.is_duplicate_hint === true;

    // Language code — default to 'other' if unrecognised
    const VALID_LANGUAGES = [
      'en', 'hi', 'ta', 'te', 'bn', 'mr', 'kn', 'ml', 'gu', 'pa', 'other',
    ];
    const language_detected = VALID_LANGUAGES.includes(parsed.language_detected)
      ? parsed.language_detected
      : 'other';

    return {
      category,
      description: parsed.description || rawText.substring(0, 200),
      urgency_score,
      vulnerability_flags,
      location_text: parsed.location_text || null,
      is_duplicate_hint,
      language_detected,
      native_reply_message: parsed.native_reply_message || null,
    };
  } catch (err) {
    console.error('❌ Gemini triage failed:', err.message);
    return buildFallbackTriage(rawText, err.message);
  }
};

/**
 * Build a safe fallback triage result when Gemini is unavailable.
 */
const buildFallbackTriage = (rawText, errorMessage) => ({
  category: 'other',
  description: rawText ? rawText.substring(0, 200) : 'Triage unavailable',
  urgency_score: 50,
  vulnerability_flags: [],
  location_text: null,
  is_duplicate_hint: false,
  language_detected: 'other',
  _triage_error: errorMessage,
});

// ─────────────────────────────────────────────────────────────
// FUNCTION 2: translateAndClean
// ─────────────────────────────────────────────────────────────

/**
 * Translate and clean a raw community message into proper English.
 *
 * @param {string}  rawText - the original message
 * @param {string}  [targetLanguage='en'] - ISO 639-1 code for output language
 * @returns {{ original_language: string, cleaned_text: string, confidence: number }}
 */
const translateAndClean = async (rawText, targetLanguage = 'en') => {
  if (!rawText || rawText.trim().length === 0) {
    return {
      original_language: 'other',
      cleaned_text: '',
      confidence: 0,
    };
  }

  try {
    const prompt = [
      TRANSLATE_SYSTEM_PROMPT,
      '',
      `Target language: ${targetLanguage}`,
      `Raw message:`,
      rawText,
    ].join('\n');

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    const parsed = extractJSON(text);

    if (!parsed.cleaned_text) {
      throw new Error('Gemini translate response missing cleaned_text');
    }

    // Normalise language code
    const VALID_LANGUAGES = [
      'en', 'hi', 'ta', 'te', 'bn', 'mr', 'kn', 'ml', 'gu', 'pa', 'other',
    ];
    const original_language = VALID_LANGUAGES.includes(parsed.original_language)
      ? parsed.original_language
      : 'other';

    // Clamp confidence to 0.0–1.0
    const confidence = Math.min(
      Math.max(parseFloat(parsed.confidence) || 0, 0),
      1.0
    );

    return {
      original_language,
      cleaned_text: parsed.cleaned_text,
      confidence: Math.round(confidence * 100) / 100,
    };
  } catch (err) {
    console.error('❌ Gemini translate/clean failed:', err.message);

    return {
      original_language: 'other',
      cleaned_text: rawText,
      confidence: 0,
      _translate_error: err.message,
    };
  }
};

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────

module.exports = {
  triageReport,
  translateAndClean,
};
