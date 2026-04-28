-- ============================================================
-- CommunityPulse — Supabase SQL Schema
-- Google Solution Challenge 2026
--
-- Run this entire file in the Supabase SQL Editor (Dashboard →
-- SQL Editor → New Query → paste → Run). It is idempotent-safe
-- thanks to IF NOT EXISTS / OR REPLACE guards.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 0. EXTENSIONS
-- ────────────────────────────────────────────────────────────
-- pgcrypto gives us gen_random_uuid() for primary keys
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ────────────────────────────────────────────────────────────
-- 1. VOLUNTEERS TABLE
--    Created FIRST because community_needs has a FK to it.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS volunteers (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic profile
  name                 TEXT NOT NULL,
  phone                TEXT UNIQUE NOT NULL,           -- primary contact
  email                TEXT UNIQUE,                    -- optional email

  -- Skills & location
  skills               TEXT[] DEFAULT '{}',            -- e.g. {'medical','driving'}
  latitude             FLOAT,
  longitude            FLOAT,

  -- Availability & capacity
  is_available         BOOLEAN DEFAULT TRUE,
  weekly_hour_limit    INTEGER DEFAULT 10,             -- max hrs/week volunteer wants
  hours_this_week      FLOAT   DEFAULT 0,              -- tracked by backend each week

  -- Reputation
  reliability_score    FLOAT   DEFAULT 0.75            -- 0.0 – 1.0, updated on task completion
    CHECK (reliability_score >= 0 AND reliability_score <= 1),
  total_tasks_completed INTEGER DEFAULT 0,

  -- Push notification token (OneSignal)
  onesignal_player_id  TEXT,

  -- Soft-delete / deactivation flag
  is_active            BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Comment the table so Supabase Dashboard shows a tooltip
COMMENT ON TABLE volunteers IS 'Registered volunteers with skills, location, and reliability tracking.';


-- ────────────────────────────────────────────────────────────
-- 2. HOTSPOT CLUSTERS TABLE
--    Created before community_needs because needs FK to it.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hotspot_clusters (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  category             TEXT NOT NULL,                  -- e.g. 'food', 'medical'
  center_latitude      FLOAT NOT NULL,
  center_longitude     FLOAT NOT NULL,
  radius_meters        INTEGER DEFAULT 500,            -- geographic extent

  report_count         INTEGER DEFAULT 1,              -- how many needs rolled into this cluster
  is_active            BOOLEAN DEFAULT TRUE,

  first_seen_at        TIMESTAMPTZ DEFAULT NOW(),
  last_updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE hotspot_clusters IS 'Geographic clusters of recurring needs used for heatmap and pattern detection.';


-- ────────────────────────────────────────────────────────────
-- 3. COMMUNITY NEEDS TABLE  (core table)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_needs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Raw intake
  raw_input             TEXT NOT NULL,                  -- original message verbatim
  source_channel        TEXT NOT NULL                   -- intake channel
    CHECK (source_channel IN ('whatsapp', 'sms', 'web_form', 'voice', 'csv')),

  -- AI-processed fields
  category              TEXT,                           -- 'food', 'medical', 'shelter', 'education', etc.
  description           TEXT,                           -- AI-cleaned summary

  -- Scoring
  urgency_score         INTEGER DEFAULT 0              -- 0-100 from AI triage
    CHECK (urgency_score >= 0 AND urgency_score <= 100),
  vulnerability_flags   TEXT[] DEFAULT '{}',            -- e.g. {'elderly','child','disabled'}
  priority_score        FLOAT DEFAULT 0,               -- final computed score (urgency × vulnerability × recency)

  -- Clustering
  cluster_id            UUID REFERENCES hotspot_clusters(id)
                        ON DELETE SET NULL,             -- nullable, set when clustered

  -- Location
  location_text         TEXT,                           -- raw location string from reporter
  latitude              FLOAT,
  longitude             FLOAT,

  -- Workflow status
  status                TEXT DEFAULT 'open'
    CHECK (status IN ('open', 'assigned', 'in_progress', 'completed', 'cancelled')),
  assigned_volunteer_id UUID REFERENCES volunteers(id)
                        ON DELETE SET NULL,             -- who is working on it

  -- Timeline
  reported_at           TIMESTAMPTZ DEFAULT NOW(),
  resolved_at           TIMESTAMPTZ,                   -- set when status → completed

  -- Quick beneficiary confirmation (nullable until feedback received)
  beneficiary_feedback  TEXT
    CHECK (beneficiary_feedback IN ('yes', 'no') OR beneficiary_feedback IS NULL),

  -- Timestamps
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE community_needs IS 'Every community need report ingested from any channel, scored and triaged by AI.';


-- ────────────────────────────────────────────────────────────
-- 4. TASKS TABLE
--    Junction between a need and a volunteer assignment.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  need_id               UUID NOT NULL REFERENCES community_needs(id)
                        ON DELETE CASCADE,              -- if need is deleted, task goes too
  volunteer_id          UUID REFERENCES volunteers(id)
                        ON DELETE SET NULL,             -- volunteer can be unlinked

  status                TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'notified', 'accepted', 'completed', 'failed')),

  -- Timeline
  notified_at           TIMESTAMPTZ,                   -- when push/SMS was sent
  accepted_at           TIMESTAMPTZ,                   -- volunteer accepted
  completed_at          TIMESTAMPTZ,                   -- task marked done

  coordinator_notes     TEXT,                           -- free-text notes from NGO coordinator

  created_at            TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tasks IS 'Individual task assignments linking a community need to a volunteer.';


-- ────────────────────────────────────────────────────────────
-- 5. BENEFICIARY FEEDBACK TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS beneficiary_feedback (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  need_id               UUID NOT NULL REFERENCES community_needs(id)
                        ON DELETE CASCADE,

  response              TEXT NOT NULL                   -- 'yes' or 'no'
    CHECK (response IN ('yes', 'no')),

  received_at           TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE beneficiary_feedback IS 'Simple yes/no confirmation from beneficiaries that help was received.';


-- ============================================================
-- INDEXES
-- ============================================================

-- Fast lookup of open / in-progress needs for the dashboard
CREATE INDEX IF NOT EXISTS idx_needs_status
  ON community_needs (status);

-- Sorting by priority when matching volunteers
CREATE INDEX IF NOT EXISTS idx_needs_priority_desc
  ON community_needs (priority_score DESC);

-- Geo queries — find needs near a volunteer
CREATE INDEX IF NOT EXISTS idx_needs_location
  ON community_needs (latitude, longitude);

-- Quick filter for available volunteers during matching
CREATE INDEX IF NOT EXISTS idx_volunteers_available
  ON volunteers (is_available);

-- Tasks by status for the coordinator dashboard
CREATE INDEX IF NOT EXISTS idx_tasks_status
  ON tasks (status);

-- Tasks by volunteer for "my tasks" view
CREATE INDEX IF NOT EXISTS idx_tasks_volunteer
  ON tasks (volunteer_id);

-- Feedback lookup by need
CREATE INDEX IF NOT EXISTS idx_feedback_need
  ON beneficiary_feedback (need_id);


-- ============================================================
-- TRIGGER: auto-update `updated_at` on row modification
-- ============================================================

-- Reusable trigger function — sets updated_at = NOW() before every UPDATE
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  -- Overwrite updated_at with the current timestamp on every update
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to community_needs
DROP TRIGGER IF EXISTS trg_needs_updated_at ON community_needs;
CREATE TRIGGER trg_needs_updated_at
  BEFORE UPDATE ON community_needs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Attach the trigger to volunteers
DROP TRIGGER IF EXISTS trg_volunteers_updated_at ON volunteers;
CREATE TRIGGER trg_volunteers_updated_at
  BEFORE UPDATE ON volunteers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on every table (Supabase requires this)
ALTER TABLE community_needs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotspot_clusters     ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiary_feedback ENABLE ROW LEVEL SECURITY;

-- ── community_needs ──────────────────────────────────────

-- Anyone (including anon) can READ needs — powers the public dashboard
CREATE POLICY "Public read access for needs"
  ON community_needs
  FOR SELECT
  USING (true);

-- Only authenticated users (coordinators / backend service role) can INSERT
CREATE POLICY "Authenticated insert for needs"
  ON community_needs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only authenticated users can UPDATE (status changes, volunteer assignment)
CREATE POLICY "Authenticated update for needs"
  ON community_needs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── volunteers ───────────────────────────────────────────

-- Public read so the matching algorithm (running via service key) can query
CREATE POLICY "Public read access for volunteers"
  ON volunteers
  FOR SELECT
  USING (true);

-- Authenticated insert (self-registration via the app)
CREATE POLICY "Authenticated insert for volunteers"
  ON volunteers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated update (profile edits, availability toggle)
CREATE POLICY "Authenticated update for volunteers"
  ON volunteers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── tasks ────────────────────────────────────────────────

CREATE POLICY "Public read access for tasks"
  ON tasks
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated insert for tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated update for tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── hotspot_clusters ─────────────────────────────────────

CREATE POLICY "Public read access for clusters"
  ON hotspot_clusters
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated write for clusters"
  ON hotspot_clusters
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated update for clusters"
  ON hotspot_clusters
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── beneficiary_feedback ─────────────────────────────────

CREATE POLICY "Public read access for feedback"
  ON beneficiary_feedback
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated insert for feedback"
  ON beneficiary_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- ============================================================
-- SUPABASE REALTIME
-- Enable realtime broadcasts for the tables the dashboard
-- needs to watch for live updates.
-- ============================================================

-- In Supabase, realtime is enabled per-table via the dashboard or
-- by inserting into the supabase_realtime publication.
-- This works on Supabase-hosted Postgres:

ALTER PUBLICATION supabase_realtime ADD TABLE community_needs;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;


-- ============================================================
-- SEED DATA (optional — uncomment to test immediately)
-- ============================================================

/*
-- Sample volunteer
INSERT INTO volunteers (name, phone, skills, latitude, longitude)
VALUES
  ('Priya Sharma', '+919876543210', ARRAY['medical','counseling'], 28.6139, 77.2090),
  ('Rahul Verma',  '+919876543211', ARRAY['driving','food_distribution'], 28.6200, 77.2100);

-- Sample community need
INSERT INTO community_needs (raw_input, source_channel, category, description, urgency_score, vulnerability_flags, priority_score, location_text, latitude, longitude)
VALUES
  ('My grandmother has not eaten since yesterday, she is alone at home near Saket metro',
   'whatsapp', 'food',
   'Elderly woman living alone near Saket metro has not eaten in 24 hours. Requires food delivery.',
   85, ARRAY['elderly'], 82.5,
   'near Saket metro', 28.5244, 77.2167);
*/


-- ============================================================
-- DONE 🎉
-- Schema is ready. Connect your Express backend using the
-- Supabase JS client with SUPABASE_URL and SUPABASE_SERVICE_KEY.
-- ============================================================
