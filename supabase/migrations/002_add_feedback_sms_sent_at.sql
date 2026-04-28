-- ============================================================
-- Migration: Add feedback_sms_sent_at to community_needs
-- Tracks when the automated 24-hour feedback SMS was sent
-- to prevent duplicate sends from the cron job.
-- ============================================================

ALTER TABLE community_needs
  ADD COLUMN IF NOT EXISTS feedback_sms_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN community_needs.feedback_sms_sent_at
  IS 'Timestamp when the automated 24h feedback SMS was sent. NULL means not yet sent.';
