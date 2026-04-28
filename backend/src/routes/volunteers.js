// ============================================================
// src/routes/volunteers.js
// CRUD endpoints for volunteer management.
//
// GET    /api/volunteers          — list all volunteers
// GET    /api/volunteers/:id      — get a single volunteer
// POST   /api/volunteers          — register a new volunteer
// PATCH  /api/volunteers/:id      — update volunteer profile
// GET    /api/volunteers/:id/tasks — get tasks for a volunteer
// ============================================================

const express = require('express');
const router = express.Router();

const {
  getAllVolunteers,
  getVolunteerById,
  createVolunteer,
  updateVolunteer,
  getTasksByVolunteer,
} = require('../services/supabaseService');
const { validateVolunteer, validateId } = require('../middleware/validate');

// ── GET /api/volunteers ─────────────────────────────────────
// Query params: ?active_only=true
router.get('/', async (req, res, next) => {
  try {
    const activeOnly = req.query.active_only === 'true';
    const volunteers = await getAllVolunteers({ active_only: activeOnly });

    res.json({
      success: true,
      count: volunteers.length,
      data: volunteers,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/volunteers/:id ─────────────────────────────────
router.get('/:id', validateId, async (req, res, next) => {
  try {
    const volunteer = await getVolunteerById(req.params.id);
    res.json({ success: true, data: volunteer });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/volunteers ────────────────────────────────────
// Register a new volunteer
router.post('/', validateVolunteer, async (req, res, next) => {
  try {
    const {
      name,
      phone,
      email,
      skills,
      latitude,
      longitude,
      weekly_hour_limit,
      onesignal_player_id,
    } = req.body;

    const volunteerData = {
      name,
      phone,
      email: email || null,
      skills: skills || [],
      latitude: latitude || null,
      longitude: longitude || null,
      weekly_hour_limit: weekly_hour_limit || 10,
      onesignal_player_id: onesignal_player_id || null,
    };

    const saved = await createVolunteer(volunteerData);

    res.status(201).json({
      success: true,
      data: saved,
    });
  } catch (err) {
    // Handle duplicate phone/email gracefully
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'A volunteer with this phone or email already exists.',
      });
    }
    next(err);
  }
});

// ── PATCH /api/volunteers/:id ───────────────────────────────
// Update volunteer profile (availability, location, skills, etc.)
router.patch('/:id', validateId, async (req, res, next) => {
  try {
    // Whitelist allowed fields
    const allowedFields = [
      'name',
      'phone',
      'email',
      'skills',
      'latitude',
      'longitude',
      'is_available',
      'weekly_hour_limit',
      'hours_this_week',
      'reliability_score',
      'total_tasks_completed',
      'onesignal_player_id',
      'is_active',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update.',
      });
    }

    const updated = await updateVolunteer(req.params.id, updates);
    res.json({ success: true, data: updated });
  } catch (err) {
    // Handle duplicate phone/email on update too
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'A volunteer with this phone or email already exists.',
      });
    }
    next(err);
  }
});

// ── GET /api/volunteers/:id/tasks ───────────────────────────
// Fetch all tasks assigned to this volunteer
router.get('/:id/tasks', validateId, async (req, res, next) => {
  try {
    const tasks = await getTasksByVolunteer(req.params.id);
    res.json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
