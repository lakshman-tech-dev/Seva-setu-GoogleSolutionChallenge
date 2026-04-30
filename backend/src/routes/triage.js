// ============================================================
// src/routes/triage.js
// Endpoints for AI triage and volunteer assignment workflow.
//
// POST /api/triage/analyze   — dry-run AI triage (no DB write)
// POST /api/triage/assign    — auto-match + assign + notify
// PATCH /api/triage/task/:id — update task status (accept/complete/fail)
// ============================================================

const express = require('express');
const router = express.Router();

const {
  getNeedById,
  updateNeed,
  createTask,
  updateTask,
  updateVolunteer,
  getVolunteerById,
} = require('../services/supabaseService');
const { triageReport } = require('../services/claudeService');
const { findBestVolunteers, updateReliabilityScore } = require('../services/matchingService');
const { notifyVolunteer } = require('../services/notificationService');
const { validateId, validateTaskStatus } = require('../middleware/validate');
const { body } = require('express-validator');
const { runValidation } = require('../middleware/validate');

// ── POST /api/triage/analyze ────────────────────────────────
// Dry-run: send text to Claude and get triage result WITHOUT
// saving anything. Useful for testing / previewing.
router.post(
  '/analyze',
  [
    body('raw_input').notEmpty().withMessage('raw_input is required'),
    body('source_channel')
      .optional()
      .isIn(['whatsapp', 'sms', 'web_form', 'voice', 'csv']),
    runValidation,
  ],
  async (req, res, next) => {
    try {
      const { raw_input, source_channel = 'web_form' } = req.body;
      const result = await triageReport(raw_input, source_channel);

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/triage/assign ─────────────────────────────────
// Full assignment workflow:
//   1. Find the best volunteer match for a need
//   2. Create a task record
//   3. Update the need status to 'assigned'
//   4. Send notifications to the volunteer
router.post(
  '/assign',
  [
    body('need_id').isUUID().withMessage('need_id must be a valid UUID'),
    body('volunteer_id')
      .optional()
      .isUUID()
      .withMessage('volunteer_id must be a valid UUID'),
    runValidation,
  ],
  async (req, res, next) => {
    try {
      const { need_id, volunteer_id } = req.body;

      // Fetch the need
      const need = await getNeedById(need_id);
      if (!need) {
        return res.status(404).json({ success: false, error: 'Need not found' });
      }

      let selectedVolunteer;

      if (volunteer_id) {
        // Manual assignment: coordinator picked a specific volunteer
        selectedVolunteer = await getVolunteerById(volunteer_id);
      } else {
        // Auto-match: find the single best available volunteer
        const matches = await findBestVolunteers(need, 1);
        if (matches.length > 0) {
          selectedVolunteer = matches[0].volunteer;
        }
      }

      if (!selectedVolunteer) {
        return res.status(404).json({
          success: false,
          error: 'No available volunteers found for this mission.',
        });
      }

      // Create the task
      const task = await createTask({
        need_id,
        volunteer_id: selectedVolunteer.id,
        status: 'notified',
        notified_at: new Date().toISOString(),
      });

      // Update the need status and assigned volunteer
      await updateNeed(need_id, {
        status: 'assigned',
        assigned_volunteer_id: selectedVolunteer.id,
      });

      // Send notifications (non-blocking — don't fail if notification fails)
      try {
        await notifyVolunteer(selectedVolunteer, need, task.id);
      } catch (notifErr) {
        console.error('⚠️  Notification failed (non-critical):', notifErr.message);
      }

      res.status(201).json({
        success: true,
        data: {
          task,
          volunteer: {
            id: selectedVolunteer.id,
            name: selectedVolunteer.name,
            phone: selectedVolunteer.phone,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── PATCH /api/triage/task/:id ──────────────────────────────
// Update a task's status (volunteer accepts, completes, or fails)
router.patch(
  '/task/:id',
  validateId,
  validateTaskStatus,
  async (req, res, next) => {
    try {
      const { status, coordinator_notes } = req.body;

      // Build update payload with appropriate timestamps
      const updates = { status };
      if (coordinator_notes) updates.coordinator_notes = coordinator_notes;

      if (status === 'accepted') {
        updates.accepted_at = new Date().toISOString();
      }

      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const task = await updateTask(req.params.id, updates);

      // ── Side-effects based on status change ─────────────────
      if (status === 'accepted' && task.need_id) {
        // Move the need to "in_progress"
        await updateNeed(task.need_id, { status: 'in_progress' });
      }

      if (status === 'completed' && task.volunteer_id) {
        // Move the need to "completed"
        if (task.need_id) {
          await updateNeed(task.need_id, {
            status: 'completed',
            resolved_at: new Date().toISOString(),
          });
        }

        // Update reliability via EMA (10% weight on completion → nudges UP)
        await updateReliabilityScore(task.volunteer_id, true);

        // Increment completed count and add estimated hours
        const volunteer = await getVolunteerById(task.volunteer_id);
        await updateVolunteer(task.volunteer_id, {
          total_tasks_completed: (volunteer.total_tasks_completed || 0) + 1,
          hours_this_week: (volunteer.hours_this_week || 0) + 2, // estimate 2 hrs/task
        });
      }

      if (status === 'failed' && task.need_id) {
        // Reopen the need so it can be re-assigned
        await updateNeed(task.need_id, {
          status: 'open',
          assigned_volunteer_id: null,
        });

        // Update reliability via EMA (10% weight on failure → nudges DOWN)
        if (task.volunteer_id) {
          await updateReliabilityScore(task.volunteer_id, false);
        }
      }

      res.json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;

