// ============================================================
// src/services/notificationService.js
// Sends push notifications (OneSignal) and SMS/WhatsApp
// messages (Twilio) to volunteers when they are matched to
// a community need.
// ============================================================

const axios = require('axios');
const twilio = require('twilio');

// ── Twilio client (lazy-initialised to avoid crash on import
//    if env vars aren't set yet) ─────────────────────────────
let twilioClient = null;
const getTwilioClient = () => {
  if (!twilioClient) {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
  return twilioClient;
};

// ─────────────────────────────────────────────────────────────
// ONESIGNAL — Web / Mobile push notifications
// ─────────────────────────────────────────────────────────────

/**
 * Send a push notification to a specific volunteer via OneSignal.
 *
 * @param {string}  playerId - OneSignal player_id of the volunteer
 * @param {string}  title    - notification title
 * @param {string}  message  - notification body
 * @param {Object}  [data]   - optional key-value data payload
 * @returns {Object|null} OneSignal API response or null on failure
 */
const sendPushNotification = async (playerId, title, message, data = {}) => {
  if (!playerId) {
    console.warn('⚠️  No OneSignal player_id — skipping push notification.');
    return null;
  }

  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_API_KEY;

  if (!appId || !apiKey) {
    console.warn('⚠️  OneSignal credentials not set — skipping push.');
    return null;
  }

  try {
    const response = await axios.post(
      'https://onesignal.com/api/v1/notifications',
      {
        app_id: appId,
        include_player_ids: [playerId],
        headings: { en: title },
        contents: { en: message },
        data,                            // custom data the app can use on tap
      },
      {
        headers: {
          Authorization: `Basic ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    );

    console.log(`📣 Push sent to player ${playerId}`);
    return response.data;
  } catch (err) {
    console.error('❌ OneSignal push failed:', err.response?.data || err.message);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────
// TWILIO — SMS notifications
// ─────────────────────────────────────────────────────────────

/**
 * Send an SMS to a volunteer's phone number.
 *
 * @param {string} phoneNumber - E.164 format (e.g. +919876543210)
 * @param {string} message     - SMS body (max ~1600 chars)
 * @returns {Object|null} Twilio message SID or null on failure
 */
const sendSMS = async (phoneNumber, message) => {
  if (!phoneNumber) return null;

  const fromNumber = process.env.TWILIO_SMS_NUMBER;
  if (!fromNumber) {
    console.warn('⚠️  TWILIO_SMS_NUMBER not set — skipping SMS.');
    return null;
  }

  try {
    const client = getTwilioClient();
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: phoneNumber,
    });

    console.log(`📱 SMS sent to ${phoneNumber} (SID: ${result.sid})`);
    return { sid: result.sid, status: result.status };
  } catch (err) {
    console.error('❌ Twilio SMS failed:', err.message);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────
// TWILIO — WhatsApp notifications
// ─────────────────────────────────────────────────────────────

/**
 * Send a WhatsApp message to a volunteer.
 *
 * @param {string} phoneNumber - E.164 format WITHOUT "whatsapp:" prefix
 * @param {string} message     - message body
 * @returns {Object|null} Twilio message SID or null on failure
 */
const sendWhatsApp = async (phoneNumber, message) => {
  if (!phoneNumber) return null;

  const fromWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER;
  if (!fromWhatsApp) {
    console.warn('⚠️  TWILIO_WHATSAPP_NUMBER not set — skipping WhatsApp.');
    return null;
  }

  try {
    const client = getTwilioClient();
    const result = await client.messages.create({
      body: message,
      from: fromWhatsApp,                // "whatsapp:+14155238886"
      to: `whatsapp:${phoneNumber}`,     // add the whatsapp: prefix
    });

    console.log(`💬 WhatsApp sent to ${phoneNumber} (SID: ${result.sid})`);
    return { sid: result.sid, status: result.status };
  } catch (err) {
    console.error('❌ Twilio WhatsApp failed:', err.message);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────
// HIGH-LEVEL — Notify a volunteer about a task assignment
// ─────────────────────────────────────────────────────────────

/**
 * Send all available notification channels to a matched volunteer.
 * Tries push → WhatsApp → SMS in order. Non-blocking: failures
 * in one channel don't prevent the others from firing.
 *
 * @param {Object} volunteer - volunteer row from Supabase
 * @param {Object} need      - community_needs row
 * @param {string} taskId    - UUID of the newly created task
 */
const notifyVolunteer = async (volunteer, need, taskId) => {
  const title = `🆘 New Task: ${need.category || 'Community Need'}`;
  const message = [
    `Hi ${volunteer.name}! A new ${need.category || 'community'} need has been reported.`,
    `📍 ${need.location_text || 'Location not specified'}`,
    `📝 ${need.description || need.raw_input?.substring(0, 100)}`,
    `\nPlease respond to accept this task.`,
  ].join('\n');

  const data = { task_id: taskId, need_id: need.id };

  // Fire all channels in parallel — don't wait for one to finish
  // before trying the next
  const results = await Promise.allSettled([
    sendPushNotification(volunteer.onesignal_player_id, title, message, data),
    sendWhatsApp(volunteer.phone, message),
    sendSMS(volunteer.phone, message),
  ]);

  // Log which channels succeeded
  const channels = ['push', 'whatsapp', 'sms'];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value) {
      console.log(`  ✅ ${channels[i]} notification sent`);
    }
  });
};

module.exports = {
  sendPushNotification,
  sendSMS,
  sendWhatsApp,
  notifyVolunteer,
};
