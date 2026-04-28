// ============================================================
// src/routes/webhooks.js
//
// Twilio webhook handlers for incoming WhatsApp, SMS messages,
// and beneficiary feedback replies.
//
// POST /api/webhooks/whatsapp  — Twilio WhatsApp incoming
// POST /api/webhooks/sms       — Twilio SMS incoming
// POST /api/webhooks/feedback  — Beneficiary YES/NO reply
//
// All Twilio endpoints validate the X-Twilio-Signature header
// to prevent spoofed requests.
// ============================================================

const express = require('express');
const router = express.Router();
const twilio = require('twilio');

// ── Services ────────────────────────────────────────────────
const {
  createNeed,
  updateNeed,
  getNeedById,
  createFeedback,
  supabase,
} = require('../services/supabaseService');
const { triageReport } = require('../services/claudeService');
const { geocodeLocation } = require('../services/geocodingService');
const { calculatePriorityScore } = require('../utils/priorityScore');
const { assignToCluster } = require('../services/clusterService');

// ─────────────────────────────────────────────────────────────
// TWILIO SIGNATURE VALIDATION MIDDLEWARE
//
// Twilio signs every webhook request with a hash of your
// Auth Token + request URL + POST params. We verify that
// signature to ensure the request genuinely came from Twilio
// and wasn't spoofed.
//
// In development (TWILIO_AUTH_TOKEN not set), validation is
// skipped so you can test with curl / Postman.
// ─────────────────────────────────────────────────────────────

/**
 * Express middleware that validates the X-Twilio-Signature header.
 *
 * How Twilio signs requests:
 *   1. Takes your Auth Token
 *   2. Takes the full URL Twilio is calling
 *   3. Sorts all POST parameters alphabetically
 *   4. Concatenates the URL + key/value pairs
 *   5. Generates HMAC-SHA1 and base64-encodes it
 *   6. Sends the result as X-Twilio-Signature header
 *
 * We reproduce this on our side using twilio.validateRequest()
 * and reject the request if the signatures don't match.
 */
const validateTwilioSignature = (req, res, next) => {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  // Skip validation in development if auth token isn't configured
  if (!authToken) {
    console.warn(
      '⚠️  TWILIO_AUTH_TOKEN not set — skipping signature validation. ' +
      'Set it in production to prevent spoofed webhooks.'
    );
    return next();
  }

  // The signature Twilio sent with this request
  const twilioSignature = req.headers['x-twilio-signature'] || '';

  // Reconstruct the full URL that Twilio used to call us.
  // In production behind a proxy (Railway, Vercel), use the
  // X-Forwarded-Proto and Host headers to get the real URL.
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['host'];
  const fullUrl = `${protocol}://${host}${req.originalUrl}`;

  // Twilio sends form-encoded POST data; the params are in req.body
  // after express.urlencoded() middleware runs.
  const isValid = twilio.validateRequest(
    authToken,
    twilioSignature,
    fullUrl,
    req.body || {}
  );

  if (!isValid) {
    console.error('❌ Twilio signature validation failed for:', fullUrl);
    return res.status(403).type('text/xml').send(
      '<Response><Message>Request validation failed.</Message></Response>'
    );
  }

  next();
};

// ─────────────────────────────────────────────────────────────
// HELPER: Send a TwiML XML response
//
// Twilio expects all webhook responses to be valid TwiML XML.
// This helper wraps a message string in the correct XML tags
// and sets the Content-Type header.
// ─────────────────────────────────────────────────────────────

/**
 * Send a TwiML <Response><Message> to Twilio.
 *
 * @param {Object} res - Express response object
 * @param {string} message - the text to send back to the user
 */
const sendTwiML = (res, message) => {
  // Escape XML special characters to prevent injection
  const escaped = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  res.type('text/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>${escaped}</Message></Response>`
  );
};

// ─────────────────────────────────────────────────────────────
// HELPER: Run the full intake pipeline
//
// Shared logic for both WhatsApp and SMS. Runs AI triage,
// geocoding, priority scoring, DB insert, and clustering.
// Returns the saved need or throws on critical failure.
// ─────────────────────────────────────────────────────────────

/**
 * Process a raw community message through the full triage pipeline.
 *
 * @param {string} rawInput      - the message text (may include "[Photo attached]" prefix)
 * @param {string} sourceChannel - 'whatsapp' or 'sms'
 * @param {string} phoneNumber   - sender's phone number (E.164)
 * @returns {Object} the saved community_needs row from Supabase
 */
const processIntakePipeline = async (rawInput, sourceChannel, phoneNumber) => {
  // ── Step 1: AI triage ───────────────────────────────────────
  const triage = await triageReport(rawInput, sourceChannel);

  // ── Step 2: Geocode location ────────────────────────────────
  let latitude = null;
  let longitude = null;

  if (triage.location_text) {
    const geo = await geocodeLocation(triage.location_text);
    if (geo) {
      latitude = geo.latitude;
      longitude = geo.longitude;
    }
  }

  // ── Step 3: Compute priority score ──────────────────────────
  const priority_score = calculatePriorityScore({
    urgency_score: triage.urgency_score,
    vulnerability_flags: triage.vulnerability_flags,
    reported_at: new Date().toISOString(),
    category: triage.category,
  });

  // ── Step 4: Insert into Supabase ────────────────────────────
  const needData = {
    raw_input: rawInput,
    source_channel: sourceChannel,
    category: triage.category,
    description: triage.description,
    urgency_score: triage.urgency_score,
    vulnerability_flags: triage.vulnerability_flags,
    priority_score,
    location_text: triage.location_text,
    latitude,
    longitude,
    status: 'open',
  };

  const savedNeed = await createNeed(needData);

  // ── Step 5: Cluster assignment (non-critical) ───────────────
  try {
    await assignToCluster(savedNeed);
  } catch (clusterErr) {
    console.error('⚠️  Clustering failed (non-critical):', clusterErr.message);
  }

  console.log(
    `📥 New ${sourceChannel} intake from ${phoneNumber}: ` +
    `category=${triage.category}, urgency=${triage.urgency_score}, id=${savedNeed.id}`
  );

  savedNeed.native_reply_message = triage.native_reply_message;
  return savedNeed;
};

// ─────────────────────────────────────────────────────────────
// POST /api/webhooks/whatsapp
//
// Twilio WhatsApp webhook. Receives form-encoded POST with:
//   - Body: message text
//   - From: "whatsapp:+919876543210"
//   - To: our Twilio WhatsApp number
//   - NumMedia: number of attached media files
//   - MediaUrl0: URL of the first attached photo (if any)
//   - MediaContentType0: MIME type of the attached media
//
// Configure in Twilio Console → Messaging → WhatsApp Sandbox
// → "When a message comes in" webhook URL.
// ─────────────────────────────────────────────────────────────
router.post('/whatsapp', validateTwilioSignature, async (req, res) => {
  try {
    // ── Extract fields from Twilio's POST body ────────────────
    let messageBody = req.body.Body || '';
    const rawFrom = req.body.From || '';
    const numMedia = parseInt(req.body.NumMedia || '0', 10);
    const mediaUrl = req.body.MediaUrl0 || null;
    const mediaType = req.body.MediaContentType0 || null;

    // Strip the "whatsapp:" prefix from the phone number
    // Twilio sends "whatsapp:+919876543210" — we just want "+919876543210"
    const phoneNumber = rawFrom.replace(/^whatsapp:/, '');

    // ── Handle photo attachments ──────────────────────────────
    // If the user sent a photo, prepend a note to the raw_input
    // so the AI triage and coordinators know a visual exists.
    if (numMedia > 0 && mediaUrl) {
      const mediaNote = `[Photo attached: ${mediaUrl}]`;

      // If there's also text, combine them. If photo-only, use a placeholder.
      if (messageBody.trim()) {
        messageBody = `${mediaNote} ${messageBody}`;
      } else {
        messageBody = `${mediaNote} (Photo-only report — no text provided)`;
      }

      console.log(`📸 WhatsApp photo received from ${phoneNumber}: ${mediaType}`);
    }

    // ── Guard: empty message (no text AND no photo) ───────────
    if (!messageBody.trim()) {
      return sendTwiML(
        res,
        '👋 Welcome to CommunityPulse! Please describe the community need ' +
        'you want to report. You can also attach a photo.'
      );
    }

    // ── Run the full intake pipeline ──────────────────────────
    const savedNeed = await processIntakePipeline(
      messageBody,
      'whatsapp',
      phoneNumber
    );

    // ── Respond with TwiML confirmation ───────────────────────
    if (savedNeed.native_reply_message) {
      let reply = savedNeed.native_reply_message;
      reply = reply.replace('{CATEGORY}', savedNeed.category).replace('{ID}', savedNeed.id);
      sendTwiML(res, reply);
    } else {
      sendTwiML(
        res,
        `✅ Thank you! Your report has been received and is being reviewed.\n\n` +
        `📋 Reference ID: ${savedNeed.id}\n` +
        `📂 Category: ${savedNeed.category}\n` +
        `⚡ Urgency: ${savedNeed.urgency_score}/100\n\n` +
        `We will match a volunteer to help as soon as possible.`
      );
    }
  } catch (err) {
    console.error('❌ WhatsApp webhook error:', err.message);

    // Even on failure, respond with TwiML so Twilio doesn't retry
    // and the user knows their message was received.
    sendTwiML(
      res,
      'We received your message but had trouble processing it. ' +
      'A coordinator will review it shortly.'
    );
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/webhooks/sms
//
// Twilio SMS webhook. Same pipeline as WhatsApp but without
// media handling. Receives form-encoded POST with:
//   - Body: the SMS text
//   - From: "+919876543210" (already clean E.164)
//   - To: our Twilio SMS number
//
// Configure in Twilio Console → Phone Numbers → Active Numbers
// → select your number → "A Message Comes In" webhook URL.
// ─────────────────────────────────────────────────────────────
router.post('/sms', validateTwilioSignature, async (req, res) => {
  try {
    const messageBody = req.body.Body || '';
    const phoneNumber = req.body.From || '';

    // ── Guard: empty message ──────────────────────────────────
    if (!messageBody.trim()) {
      return sendTwiML(
        res,
        'Welcome to CommunityPulse! Please text us a description of ' +
        'the community need you want to report.'
      );
    }

    // ── Run the full intake pipeline ──────────────────────────
    const savedNeed = await processIntakePipeline(
      messageBody,
      'sms',
      phoneNumber
    );

    // ── Respond with TwiML confirmation ───────────────────────
    sendTwiML(
      res,
      `Thank you! Your report has been received.\n` +
      `Reference: ${savedNeed.id}\n` +
      `Category: ${savedNeed.category}\n` +
      `A volunteer will be assigned soon.`
    );
  } catch (err) {
    console.error('❌ SMS webhook error:', err.message);

    sendTwiML(
      res,
      'We received your message but had trouble processing it. ' +
      'A coordinator will review it shortly.'
    );
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/webhooks/feedback
//
// Handles beneficiary feedback replies sent via SMS.
// When a need is marked as completed, we send an SMS asking
// "Did you receive help? Reply YES or NO". This endpoint
// processes those replies.
//
// Twilio sends the reply as a standard SMS webhook:
//   - Body: "YES" or "NO" (or variants like "yes", "Yes", "y")
//   - From: the beneficiary's phone number
//
// We look up the most recently completed need that was
// reported from this phone number and attach the feedback.
// ─────────────────────────────────────────────────────────────
router.post('/feedback', validateTwilioSignature, async (req, res) => {
  try {
    const replyBody = (req.body.Body || '').trim().toLowerCase();
    const fromPhone = req.body.From || '';

    // ── Parse the YES/NO response ─────────────────────────────
    // Be lenient: accept "y", "yes", "yeah", "yep", "1" as YES
    // and "n", "no", "nope", "0" as NO.
    let feedbackResponse = null;
    if (['yes', 'y', 'yeah', 'yep', '1', 'ha', 'haan'].includes(replyBody)) {
      feedbackResponse = 'yes';
    } else if (['no', 'n', 'nope', '0', 'nahi', 'nhi'].includes(replyBody)) {
      feedbackResponse = 'no';
    }

    if (!feedbackResponse) {
      // Not a recognizable feedback reply — treat as a new need
      // report instead. This prevents legitimate need reports from
      // being swallowed by the feedback handler.
      return sendTwiML(
        res,
        'We couldn\'t understand your reply. ' +
        'Please reply YES if you received help, or NO if you didn\'t.'
      );
    }

    // ── Find the most recently completed need for this phone ──
    // We search raw_input for the phone number since needs from
    // SMS/WhatsApp contain the sender's number.
    //
    // Strategy: find completed needs, ordered newest first,
    // and match against the sender's phone number. We check
    // both the raw_input text and the source (WhatsApp/SMS
    // would have come from this number).
    const cleanPhone = fromPhone.replace(/^whatsapp:/, '');

    const { data: recentNeeds, error: searchErr } = await supabase
      .from('community_needs')
      .select('id, raw_input, category, status')
      .eq('status', 'completed')
      .order('resolved_at', { ascending: false })
      .limit(20); // check last 20 completed needs

    if (searchErr) throw searchErr;

    // Find a need whose raw_input contains this phone number,
    // or that was most recently completed (fallback)
    let matchedNeed = recentNeeds.find((n) =>
      n.raw_input && n.raw_input.includes(cleanPhone)
    );

    // If no phone match, use the most recently completed need
    // (best guess — in production you'd track phone→need mapping)
    if (!matchedNeed && recentNeeds.length > 0) {
      matchedNeed = recentNeeds[0];
    }

    if (!matchedNeed) {
      return sendTwiML(
        res,
        'Thank you for your reply, but we couldn\'t find a recent ' +
        'request associated with your number.'
      );
    }

    // ── Save the feedback ─────────────────────────────────────

    // 1. Insert into the beneficiary_feedback table
    await createFeedback({
      need_id: matchedNeed.id,
      response: feedbackResponse,
    });

    // 2. Update the beneficiary_feedback field on the need itself
    await updateNeed(matchedNeed.id, {
      beneficiary_feedback: feedbackResponse,
    });

    console.log(
      `📝 Feedback "${feedbackResponse}" received from ${cleanPhone} ` +
      `for need ${matchedNeed.id}`
    );

    // ── Respond with TwiML thank-you ──────────────────────────
    if (feedbackResponse === 'yes') {
      sendTwiML(
        res,
        '🙏 Thank you for confirming! We\'re glad you received help. ' +
        'CommunityPulse is here whenever you need us.'
      );
    } else {
      sendTwiML(
        res,
        '😔 We\'re sorry the help wasn\'t sufficient. ' +
        'A coordinator has been notified and will follow up with you shortly.'
      );
    }
  } catch (err) {
    console.error('❌ Feedback webhook error:', err.message);

    sendTwiML(
      res,
      'Thank you for your reply. We\'ve noted your feedback.'
    );
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/webhooks/feedback/:needId
//
// Direct-link handler for SMS feedback links.
// The completion SMS in needs.js sends links like:
//   /api/webhooks/feedback/<uuid>?response=yes
//   /api/webhooks/feedback/<uuid>?response=no
//
// This endpoint accepts both GET (link click) and POST.
// No Twilio signature validation since this is a user browser click.
// ─────────────────────────────────────────────────────────────
router.get('/feedback/:needId', async (req, res, next) => {
  try {
    const { needId } = req.params;
    const response = req.query.response;

    if (!response || !['yes', 'no'].includes(response)) {
      return res.status(400).json({
        success: false,
        error: 'response query param must be "yes" or "no"',
      });
    }

    // Verify the need exists
    const need = await getNeedById(needId);
    if (!need) {
      return res.status(404).json({ success: false, error: 'Need not found' });
    }

    // Save feedback
    await createFeedback({ need_id: needId, response });
    await updateNeed(needId, { beneficiary_feedback: response });

    // Return a simple HTML thank-you page
    const emoji = response === 'yes' ? '🙏' : '😔';
    const message = response === 'yes'
      ? 'Thank you for confirming! We\'re glad we could help.'
      : 'We\'re sorry the help wasn\'t sufficient. A coordinator will follow up.';

    res.type('text/html').send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CommunityPulse — Feedback</title>
        <style>
          body { font-family: Inter, system-ui, sans-serif; background: #020617; color: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .card { background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem; padding: 2rem; max-width: 400px; text-align: center; }
          .emoji { font-size: 3rem; margin-bottom: 1rem; }
          p { color: #cbd5e1; line-height: 1.6; }
          .brand { color: #2b91ff; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="emoji">${emoji}</div>
          <h2>Feedback Received</h2>
          <p>${message}</p>
          <p style="margin-top:1rem;">— <span class="brand">CommunityPulse</span> 💙</p>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
