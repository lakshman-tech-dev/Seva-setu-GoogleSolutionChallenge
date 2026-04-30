// ============================================================
// src/routes/needs.js
//
// Community needs API — the core resource of CommunityPulse.
//
// POST   /api/needs/submit       — intake a new need (AI triage pipeline)
// GET    /api/needs              — list needs (filtered, paginated)
// GET    /api/needs/stats/summary — dashboard summary statistics
// GET    /api/needs/map/pins     — lightweight pins for the map layer
// GET    /api/needs/:id          — single need + volunteer suggestions
// PATCH  /api/needs/:id/status   — update status (with side-effects)
//
// IMPORTANT: Static routes (/stats/summary, /map/pins) are
// registered BEFORE the /:id param route so Express doesn't
// match "stats" or "map" as a UUID.
// ============================================================

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

// ── Services ────────────────────────────────────────────────
const {
  getAllNeeds,
  getNeedById,
  createNeed,
  updateNeed,
  getActiveClusters,
  getVolunteerById,
  updateVolunteer,
  supabase,
} = require('../services/supabaseService');
const { triageReport } = require('../services/claudeService');
const { geocodeLocation } = require('../services/geocodingService');
const { calculatePriorityScore } = require('../utils/priorityScore');
const { assignToCluster } = require('../services/clusterService');
const { findBestVolunteers } = require('../services/matchingService');
const { sendSMS } = require('../services/notificationService');

// ── Middleware ───────────────────────────────────────────────
const { validateId, runValidation } = require('../middleware/validate');

// ─────────────────────────────────────────────────────────────
// POST /api/needs/submit
//
// Core intake endpoint. Accepts raw community input from any
// channel and runs the full AI triage pipeline:
//   1. Validate input
//   2. AI triage (Claude) → category, urgency, vulnerability
//   3. Geocode location text → lat/lng
//   4. Compute priority score
//   5. Insert into community_needs
//   6. Assign to hotspot cluster
// ─────────────────────────────────────────────────────────────
router.post(
  '/submit',
  [
    body('raw_input')
      .notEmpty()
      .isString()
      .withMessage('raw_input is required and must be a non-empty string'),
    body('source_channel')
      .optional()
      .isIn(['whatsapp', 'sms', 'web_form', 'voice', 'csv'])
      .withMessage('source_channel must be one of: whatsapp, sms, web_form, voice, csv'),
    body('phone_number')
      .optional()
      .isString()
      .withMessage('phone_number must be a string'),
    runValidation,
  ],
  async (req, res, next) => {
    try {
      const {
        raw_input,
        source_channel = 'web_form',
        phone_number = null,
      } = req.body;

      // ── Step 1: AI triage ───────────────────────────────────
      const triage = await triageReport(raw_input, source_channel);

      // ── Step 2: Geocode location ────────────────────────────
      // Use the location extracted by Claude, or fall back to
      // any location_text the caller provided.
      let latitude = null;
      let longitude = null;
      const locationText = triage.location_text || req.body.location_text || null;

      if (locationText) {
        const geo = await geocodeLocation(locationText);
        if (geo) {
          latitude = geo.latitude;
          longitude = geo.longitude;
        }
      }

      // ── Step 3: Priority score ──────────────────────────────
      const priority_score = calculatePriorityScore({
        urgency_score: triage.urgency_score,
        vulnerability_flags: triage.vulnerability_flags,
        reported_at: new Date().toISOString(),
        category: triage.category,
      });

      // ── Step 4: Insert into Supabase ────────────────────────
      const needData = {
        raw_input,
        source_channel,
        category: triage.category,
        description: triage.description,
        urgency_score: triage.urgency_score,
        vulnerability_flags: triage.vulnerability_flags,
        priority_score,
        location_text: locationText,
        latitude,
        longitude,
        status: 'open',
      };

      const savedNeed = await createNeed(needData);

      // ── Step 5: Cluster assignment (non-critical) ───────────
      let cluster = null;
      try {
        cluster = await assignToCluster(savedNeed);
      } catch (clusterErr) {
        console.error('⚠️  Clustering failed (non-critical):', clusterErr.message);
      }

      // ── Response ────────────────────────────────────────────
      res.status(201).json({
        success: true,
        data: savedNeed,
        triage: {
          category: triage.category,
          urgency_score: triage.urgency_score,
          vulnerability_flags: triage.vulnerability_flags,
          is_duplicate_hint: triage.is_duplicate_hint,
          language_detected: triage.language_detected,
          priority_score,
        },
        cluster: cluster
          ? { id: cluster.id, report_count: cluster.report_count }
          : null,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// GET /api/needs
//
// List needs with optional filters and pagination.
// Joins with tasks → volunteers to include assigned volunteer name.
//
// Query params:
//   ?status=open          (default 'open')
//   &category=food
//   &limit=50             (default 50, max 200)
//   &offset=0
// ─────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const {
      status = 'open',
      category,
      limit: rawLimit,
      offset: rawOffset,
    } = req.query;

    const limit = Math.min(parseInt(rawLimit, 10) || 50, 200);
    const offset = parseInt(rawOffset, 10) || 0;

    // Build the query with a join through tasks → volunteers
    // The select string uses Supabase's embedded resource syntax
    let query = supabase
      .from('community_needs')
      .select(
        `*,
        tasks (
          id,
          status,
          volunteer_id,
          volunteers ( id, name, phone, reliability_score )
        )`,
        { count: 'exact' }
      )
      .order('priority_score', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    // Flatten the response: pull out the assigned volunteer name
    // from the nested tasks join for convenience
    const enriched = data.map((need) => {
      // Find the latest active task (notified/accepted) for this need
      const activeTask = need.tasks?.find((t) =>
        ['notified', 'accepted'].includes(t.status)
      );

      return {
        ...need,
        assigned_volunteer_name:
          activeTask?.volunteers?.name || null,
        // Remove the raw tasks array from the top-level response
        // to keep the payload clean (it's nested data)
        tasks: undefined,
      };
    });

    res.json({
      success: true,
      count,
      limit,
      offset,
      data: enriched,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/needs/stats/summary
//
// Dashboard statistics for the coordinator overview panel.
// Must be registered BEFORE /:id to avoid param collision.
// ─────────────────────────────────────────────────────────────
router.get('/stats/summary', async (_req, res, next) => {
  try {
    // ── Total open needs ──────────────────────────────────────
    const { count: totalOpen, error: openErr } = await supabase
      .from('community_needs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open');
    if (openErr) throw openErr;

    // ── Completed today ───────────────────────────────────────
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: totalCompletedToday, error: compErr } = await supabase
      .from('community_needs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('resolved_at', todayStart.toISOString());
    if (compErr) throw compErr;

    // ── Active volunteers (available + active) ────────────────
    const { count: totalVolunteersActive, error: volErr } = await supabase
      .from('volunteers')
      .select('id', { count: 'exact', head: true })
      .eq('is_available', true)
      .eq('is_active', true);
    if (volErr) throw volErr;

    // ── Top categories (group open needs by category) ─────────
    // Supabase JS doesn't support GROUP BY, so we fetch open
    // needs and aggregate client-side (acceptable for MVP volume)
    const { data: openNeeds, error: catErr } = await supabase
      .from('community_needs')
      .select('category')
      .eq('status', 'open');
    if (catErr) throw catErr;

    const categoryMap = {};
    for (const n of openNeeds) {
      const cat = n.category || 'other';
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    }
    const topCategories = Object.entries(categoryMap)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // ── Average priority score of open needs ──────────────────
    const { data: priorityData, error: prErr } = await supabase
      .from('community_needs')
      .select('priority_score')
      .eq('status', 'open');
    if (prErr) throw prErr;

    const avgPriorityScoreOpen =
      priorityData.length > 0
        ? Math.round(
            (priorityData.reduce((sum, n) => sum + (n.priority_score || 0), 0) /
              priorityData.length) *
              100
          ) / 100
        : 0;

    // ── Active hotspot clusters ───────────────────────────────
    const activeClusters = await getActiveClusters();

    res.json({
      success: true,
      data: {
        total_open: totalOpen || 0,
        total_completed_today: totalCompletedToday || 0,
        total_volunteers_active: totalVolunteersActive || 0,
        top_categories: topCategories,
        avg_priority_score_open: avgPriorityScoreOpen,
        hotspot_clusters_active: activeClusters.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/needs/map/pins
//
// Lightweight array of map markers for the Leaflet frontend.
// Only returns open and in_progress needs to keep the map
// focused on active work.
//
// Response: [{ id, latitude, longitude, category, status, priority_score }]
// ─────────────────────────────────────────────────────────────
router.get('/map/pins', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('community_needs')
      .select('id, latitude, longitude, category, status, priority_score')
      .in('status', ['open', 'in_progress'])
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('priority_score', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/needs/:id
//
// Full detail view of a single need, including the top 3
// volunteer match suggestions from the matching service.
// ─────────────────────────────────────────────────────────────
router.get('/:id', validateId, async (req, res, next) => {
  try {
    const need = await getNeedById(req.params.id);

    // Enrich with assigned volunteer name if applicable
    let assignedName = null;
    if (need.status !== 'open') {
      const { data: taskData } = await supabase
        .from('tasks')
        .select('volunteers(name)')
        .eq('need_id', need.id)
        .in('status', ['notified', 'accepted', 'completed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      assignedName = taskData?.volunteers?.name || null;
    }

    const enrichedNeed = {
      ...need,
      assigned_volunteer_name: assignedName
    };

    // Fetch top 3 volunteer suggestions (non-blocking)
    let volunteerSuggestions = [];
    try {
      const matches = await findBestVolunteers(need, 3);
      volunteerSuggestions = matches.map((m) => ({
        volunteer_id: m.volunteer.id,
        name: m.volunteer.name,
        phone: m.volunteer.phone,
        match_score: m.match_score,
        distance_km: m.distance_km,
        breakdown: m.breakdown,
      }));
    } catch (matchErr) {
      console.error('⚠️  Volunteer matching failed (non-critical):', matchErr.message);
    }

    res.json({
      success: true,
      data: enrichedNeed,
      volunteer_suggestions: volunteerSuggestions,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/needs/:id/status
//
// Update a need's workflow status with side-effects:
//   - completed → SMS feedback request to beneficiary
//   - completed → volunteer hours_this_week += 2
//   - completed → set resolved_at timestamp
//   - cancelled → clear assigned volunteer
//
// Body: { status, coordinator_notes? }
// ─────────────────────────────────────────────────────────────
router.patch(
  '/:id/status',
  [
    ...validateId,
    body('status')
      .isIn(['open', 'assigned', 'in_progress', 'completed', 'cancelled'])
      .withMessage(
        'status must be one of: open, assigned, in_progress, completed, cancelled'
      ),
    body('coordinator_notes')
      .optional()
      .isString()
      .withMessage('coordinator_notes must be a string'),
    runValidation,
  ],
  async (req, res, next) => {
    try {
      const { status, coordinator_notes } = req.body;
      const needId = req.params.id;

      // Fetch the current need so we have the volunteer ID & details
      const currentNeed = await getNeedById(needId);

      // ── Build the update payload ──────────────────────────────
      const updates = { status };

      // Auto-set resolved_at when completing
      if (status === 'completed') {
        updates.resolved_at = new Date().toISOString();
      }

      // Clear assignment when cancelling
      if (status === 'cancelled') {
        updates.assigned_volunteer_id = null;
      }

      // Persist the status change
      const updatedNeed = await updateNeed(needId, updates);

      // ── Side-effect: task completed ───────────────────────────
      if (status === 'completed' && currentNeed.assigned_volunteer_id) {
        // 1. Update volunteer hours (estimate 2 hrs per task)
        try {
          const volunteer = await getVolunteerById(
            currentNeed.assigned_volunteer_id
          );
          await updateVolunteer(volunteer.id, {
            hours_this_week: (volunteer.hours_this_week || 0) + 2,
          });
          console.log(
            `⏱️  Added 2 hours to ${volunteer.name}'s weekly total`
          );
        } catch (volErr) {
          console.error('⚠️  Volunteer hour update failed:', volErr.message);
        }

        // 2. Send SMS feedback request to beneficiary
        //    We send to the phone_number on the source report,
        //    or fall back to any phone in the raw_input.
        try {
          // Look for a phone number — could be on the need or
          // extracted from the original intake
          const beneficiaryPhone = extractPhoneFromNeed(currentNeed);

          if (beneficiaryPhone) {
            const baseUrl = process.env.BACKEND_URL || 'http://localhost:4000';
            const feedbackUrl = `${baseUrl}/api/webhooks/feedback/${needId}`;

            const smsBody = [
              `🙏 CommunityPulse: Your ${currentNeed.category || 'community'} need has been marked as completed.`,
              `Did you receive the help you needed?`,
              `Reply YES or NO, or click:`,
              `✅ Yes: ${feedbackUrl}?response=yes`,
              `❌ No: ${feedbackUrl}?response=no`,
            ].join('\n');

            await sendSMS(beneficiaryPhone, smsBody);
            console.log(`📱 Feedback SMS sent to ${beneficiaryPhone}`);
          }
        } catch (smsErr) {
          // SMS failure is non-critical
          console.error('⚠️  Feedback SMS failed (non-critical):', smsErr.message);
        }
      }

      // ── Side-effect: log coordinator notes ────────────────────
      if (coordinator_notes) {
        // Store coordinator notes on the most recent task for this need
        try {
          const { data: tasks } = await supabase
            .from('tasks')
            .select('id')
            .eq('need_id', needId)
            .order('created_at', { ascending: false })
            .limit(1);

          if (tasks && tasks.length > 0) {
            await supabase
              .from('tasks')
              .update({ coordinator_notes })
              .eq('id', tasks[0].id);
          }
        } catch (noteErr) {
          console.error('⚠️  Coordinator notes save failed:', noteErr.message);
        }
      }

      res.json({
        success: true,
        data: updatedNeed,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// HELPER: Extract a phone number from a need record
//
// Checks multiple sources:
//   1. The raw_input text (regex for E.164-like patterns)
//   2. Common WhatsApp/Twilio metadata fields
// Returns null if no phone found.
// ─────────────────────────────────────────────────────────────

/**
 * Try to extract a phone number from a community need record.
 *
 * @param {Object} need - community_needs row
 * @returns {string|null} E.164-ish phone string or null
 */
const extractPhoneFromNeed = (need) => {
  // WhatsApp/SMS webhook needs sometimes store the sender phone
  // in the raw_input or as metadata. Check common patterns.
  if (!need) return null;

  // Try to find a phone number in the raw text
  // Matches: +91 98765 43210, +919876543210, 9876543210, etc.
  const phoneRegex = /\+?[1-9]\d{6,14}/;
  const match = need.raw_input?.match(phoneRegex);

  return match ? match[0] : null;
};

module.exports = router;
