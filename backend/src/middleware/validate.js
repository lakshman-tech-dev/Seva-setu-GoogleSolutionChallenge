// ============================================================
// src/middleware/validate.js
// Reusable validation middleware using express-validator.
// Usage: router.post('/needs', validateNeed, handler)
// ============================================================

const { body, param, validationResult } = require('express-validator');

// ── Validation runner ───────────────────────────────────────
// Call this AFTER the validation chain; it checks for errors
// and returns 400 before the route handler ever runs.
const runValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next();
};

// ── Need creation rules ─────────────────────────────────────
const validateNeed = [
  body('raw_input')
    .notEmpty()
    .withMessage('raw_input is required — the original message text'),
  body('source_channel')
    .isIn(['whatsapp', 'sms', 'web_form', 'voice', 'csv'])
    .withMessage('source_channel must be one of: whatsapp, sms, web_form, voice, csv'),
  body('location_text')
    .optional()
    .isString()
    .withMessage('location_text must be a string'),
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('latitude must be between -90 and 90'),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('longitude must be between -180 and 180'),
  runValidation,
];

// ── Volunteer creation rules ────────────────────────────────
const validateVolunteer = [
  body('name')
    .notEmpty()
    .withMessage('name is required'),
  body('phone')
    .notEmpty()
    .withMessage('phone is required')
    .matches(/^\+?[1-9]\d{6,14}$/)
    .withMessage('phone must be a valid E.164 number (e.g. +919876543210)'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('email must be a valid email address'),
  body('skills')
    .optional()
    .isArray()
    .withMessage('skills must be an array of strings'),
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('latitude must be between -90 and 90'),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('longitude must be between -180 and 180'),
  runValidation,
];

// ── UUID param check (reusable for any :id route) ───────────
const validateId = [
  param('id')
    .isUUID()
    .withMessage('id must be a valid UUID'),
  runValidation,
];

// ── Task status update rules ────────────────────────────────
const validateTaskStatus = [
  body('status')
    .isIn(['pending', 'notified', 'accepted', 'completed', 'failed'])
    .withMessage('status must be one of: pending, notified, accepted, completed, failed'),
  runValidation,
];

module.exports = {
  validateNeed,
  validateVolunteer,
  validateId,
  validateTaskStatus,
  runValidation,
};
