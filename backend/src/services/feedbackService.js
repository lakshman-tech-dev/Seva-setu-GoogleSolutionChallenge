// ============================================================
// src/services/feedbackService.js
//
// Automated beneficiary feedback collection.
//
// Runs a node-cron job every hour that:
//   1. Finds needs completed 24+ hours ago that haven't
//      had a feedback SMS sent yet
//   2. Extracts the beneficiary's phone number from the
//      need's raw_input
//   3. Sends an SMS via Twilio asking "Was your need met?"
//   4. Marks the need with feedback_sms_sent_at to prevent
//      re-sending
//
// Usage:
//   const { startFeedbackCron } = require('./feedbackService');
//   startFeedbackCron(); // call once at server startup
// ============================================================

const cron = require('node-cron');
const { supabase } = require('./supabaseService');
const { sendSMS } = require('./notificationService');

// ── Configuration ───────────────────────────────────────────
const HOURS_AFTER_COMPLETION = 24; // wait this many hours before sending feedback SMS
const MAX_BATCH_SIZE = 20;          // process at most N needs per cron tick
const NGO_NAME = process.env.NGO_NAME || 'CommunityPulse';

// ─────────────────────────────────────────────────────────────
// PHONE EXTRACTION
//
// Tries to find a phone number in the need's raw_input text.
// WhatsApp/SMS webhook needs include the sender's phone in
// the raw text or as the From field that was prepended.
// ─────────────────────────────────────────────────────────────

/**
 * Extract a phone number from a community need.
 *
 * @param {Object} need - community_needs row
 * @returns {string|null} E.164-ish phone or null
 */
const extractPhone = (need) => {
  if (!need?.raw_input) return null;

  // Match E.164-like patterns: +919876543210, +1234567890, 9876543210
  const match = need.raw_input.match(/\+?[1-9]\d{6,14}/);
  return match ? match[0] : null;
};

// ─────────────────────────────────────────────────────────────
// CORE: Send feedback request for a single need
// ─────────────────────────────────────────────────────────────

/**
 * Send a feedback SMS to the beneficiary of a completed need.
 *
 * @param {Object} need - community_needs row (must be completed)
 * @returns {boolean} true if SMS sent, false if skipped/failed
 */
const sendFeedbackRequest = async (need) => {
  // Guard: already sent
  if (need.feedback_sms_sent_at) {
    console.log(`⏭️  Feedback already sent for need ${need.id}`);
    return false;
  }

  // Guard: no phone number
  const phone = extractPhone(need);
  if (!phone) {
    console.log(`⏭️  No phone found for need ${need.id} — skipping`);
    // Still mark as sent to avoid re-checking forever
    await markFeedbackSent(need.id);
    return false;
  }

  // Build the SMS message
  const category = need.category || 'community';
  const smsBody = [
    `Hi, the ${NGO_NAME} team helped with your ${category} request yesterday.`,
    `Was your need met?`,
    `Reply YES or NO.`,
    `Thank you! — ${NGO_NAME} 💙`,
  ].join(' ');

  // Send via Twilio
  const result = await sendSMS(phone, smsBody);

  // Mark as sent regardless of SMS outcome (to prevent retry storms)
  await markFeedbackSent(need.id);

  if (result) {
    console.log(`📱 Feedback SMS sent to ${phone} for need ${need.id}`);
    return true;
  } else {
    console.warn(`⚠️  Feedback SMS failed for need ${need.id} — marked as sent to prevent retries`);
    return false;
  }
};

// ─────────────────────────────────────────────────────────────
// HELPER: Update feedback_sms_sent_at timestamp
// ─────────────────────────────────────────────────────────────

const markFeedbackSent = async (needId) => {
  const { error } = await supabase
    .from('community_needs')
    .update({ feedback_sms_sent_at: new Date().toISOString() })
    .eq('id', needId);

  if (error) {
    console.error(`❌ Failed to mark feedback_sms_sent_at for ${needId}:`, error.message);
  }
};

// ─────────────────────────────────────────────────────────────
// CRON: Check every hour for needs that need feedback SMS
// ─────────────────────────────────────────────────────────────

/**
 * Find all needs that:
 *   1. Are completed
 *   2. Were resolved 24+ hours ago
 *   3. Haven't had a feedback SMS sent yet
 *   4. Have no existing beneficiary_feedback
 *
 * Then send feedback requests for each.
 */
const processFeedbackBatch = async () => {
  try {
    // Calculate the cutoff: resolved_at must be at least 24 hours ago
    const cutoff = new Date(Date.now() - HOURS_AFTER_COMPLETION * 60 * 60 * 1000);

    const { data: pendingNeeds, error } = await supabase
      .from('community_needs')
      .select('id, raw_input, category, resolved_at, feedback_sms_sent_at, beneficiary_feedback')
      .eq('status', 'completed')
      .is('feedback_sms_sent_at', null)          // not yet sent
      .is('beneficiary_feedback', null)           // no feedback yet
      .not('resolved_at', 'is', null)             // has a resolved_at timestamp
      .lte('resolved_at', cutoff.toISOString())   // resolved 24+ hours ago
      .order('resolved_at', { ascending: true })  // oldest first
      .limit(MAX_BATCH_SIZE);

    if (error) throw error;

    if (pendingNeeds.length === 0) {
      return; // Nothing to do — silent return
    }

    console.log(`📋 Feedback cron: found ${pendingNeeds.length} need(s) awaiting feedback SMS`);

    let sent = 0;
    let skipped = 0;

    for (const need of pendingNeeds) {
      try {
        const wasSent = await sendFeedbackRequest(need);
        if (wasSent) sent++;
        else skipped++;
      } catch (err) {
        console.error(`❌ Feedback SMS error for need ${need.id}:`, err.message);
        skipped++;
      }
    }

    console.log(`📊 Feedback cron complete: ${sent} sent, ${skipped} skipped`);
  } catch (err) {
    console.error('❌ Feedback cron batch error:', err.message);
  }
};

// ─────────────────────────────────────────────────────────────
// START THE CRON JOB
//
// Runs every hour at minute :15 (e.g. 00:15, 01:15, 02:15…)
// to avoid piling on with other hourly tasks at :00.
//
// Cron expression: "15 * * * *"
//   ┌──── minute (15)
//   │ ┌── hour (* = every)
//   │ │ ┌ day of month (*)
//   │ │ │ ┌ month (*)
//   │ │ │ │ ┌ day of week (*)
//   15 * * * *
// ─────────────────────────────────────────────────────────────

let cronJob = null;

/**
 * Start the automated feedback cron job.
 * Safe to call multiple times — will not double-schedule.
 */
const startFeedbackCron = () => {
  if (cronJob) {
    console.log('⚠️  Feedback cron already running — skipping duplicate start');
    return;
  }

  // Validate that Twilio is configured
  if (!process.env.TWILIO_SMS_NUMBER) {
    console.warn('⚠️  TWILIO_SMS_NUMBER not set — feedback cron will NOT send SMS');
    console.warn('   Set it in .env to enable automated feedback collection.');
    // Still start the cron so it's ready when config is added
  }

  cronJob = cron.schedule('15 * * * *', () => {
    console.log(`⏰ Feedback cron tick at ${new Date().toISOString()}`);
    processFeedbackBatch();
  });

  console.log('✅ Feedback cron started — checking every hour at :15 past');

  // Also run once immediately on startup (to catch any backlog)
  setTimeout(() => {
    console.log('🔄 Running initial feedback check…');
    processFeedbackBatch();
  }, 5000); // 5-second delay to let the server finish starting up
};

/**
 * Stop the cron job (for testing / graceful shutdown).
 */
const stopFeedbackCron = () => {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('🛑 Feedback cron stopped');
  }
};

module.exports = {
  sendFeedbackRequest,
  startFeedbackCron,
  stopFeedbackCron,
  processFeedbackBatch, // exported for testing
};
