# Twilio Setup Checklist

Complete these steps to enable WhatsApp and SMS intake for CommunityPulse.

---

## 1. Create Account

- [ ] Go to [twilio.com](https://www.twilio.com/try-twilio) and sign up (free trial)
- [ ] Verify your phone number
- [ ] Note your **Account SID** and **Auth Token** from the dashboard
- [ ] Paste them into `.env`:
  ```
  TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  TWILIO_AUTH_TOKEN=your-auth-token
  ```

## 2. Get a Phone Number (SMS)

- [ ] Go to **Phone Numbers → Buy a Number**
- [ ] Select a number with **SMS** capability
- [ ] Copy the number (e.g. `+1234567890`)
- [ ] Paste into `.env`:
  ```
  TWILIO_SMS_NUMBER=+1234567890
  ```

## 3. Configure SMS Webhook

- [ ] Go to **Phone Numbers → Active Numbers → select your number**
- [ ] Under **Messaging → A Message Comes In**:
  - Webhook URL: `https://YOUR_BACKEND_URL/api/webhooks/sms`
  - Method: **HTTP POST**
- [ ] Click **Save**

## 4. Set Up WhatsApp Sandbox

For development, Twilio provides a free sandbox:

- [ ] Go to **Messaging → Try it out → Send a WhatsApp message**
- [ ] Follow the instructions to join the sandbox:
  - Send `join <your-sandbox-word>` to the sandbox number from WhatsApp
- [ ] Note the sandbox number (usually `+14155238886`)
- [ ] Paste into `.env`:
  ```
  TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
  ```

## 5. Configure WhatsApp Webhook

- [ ] Go to **Messaging → Settings → WhatsApp Sandbox Settings**
- [ ] Set **"When a message comes in"**:
  - URL: `https://YOUR_BACKEND_URL/api/webhooks/whatsapp`
  - Method: **HTTP POST**
- [ ] Click **Save**

## 6. Test the Integration

### Test SMS:
```bash
# Send a test SMS to your Twilio number
# The backend should:
#   1. Receive the webhook
#   2. Run AI triage
#   3. Reply with TwiML confirmation
```

### Test WhatsApp:
1. Send a WhatsApp message to the sandbox number:
   > "Family near Connaught Place has no food, elderly grandmother alone"
2. You should receive a reply:
   > "✅ Thank you! Your report has been received. Reference ID: ..."

### Test locally with ngrok:
```bash
# Expose your local backend to the internet
npx ngrok http 4000

# Use the ngrok URL in Twilio webhook settings:
# https://abc123.ngrok.io/api/webhooks/sms
# https://abc123.ngrok.io/api/webhooks/whatsapp
```

## 7. Signature Validation

The backend validates Twilio signatures automatically when `TWILIO_AUTH_TOKEN` is set. This prevents spoofed webhook requests.

- In **development** (no auth token): validation is skipped
- In **production**: always set `TWILIO_AUTH_TOKEN` for security

---

## Production WhatsApp (Optional)

To move from sandbox to production WhatsApp:

1. Apply for a **WhatsApp Business API** account through Twilio
2. Register a dedicated phone number
3. Get approved message templates
4. Update `TWILIO_WHATSAPP_NUMBER` in `.env` to your production number
5. Update the webhook URL in Twilio console
