// ============================================================
// src/middleware/errorHandler.js
// Global Express error handler. Any error thrown (or passed to
// next(err)) in a route lands here and gets a uniform JSON
// response: { success: false, error: "..." }
// ============================================================

/**
 * Maps known error types / status codes to user-friendly messages.
 * Falls back to 500 Internal Server Error for anything unexpected.
 */
const errorHandler = (err, _req, res, _next) => {
  // Log full stack in development for debugging
  console.error('❌ Error:', err.stack || err.message || err);

  // ── Determine HTTP status ────────────────────────────────
  // Express-validator and some libraries attach a status/statusCode
  let statusCode = err.statusCode || err.status || 500;

  // Supabase client throws errors with a `code` field (e.g. "PGRST301")
  if (err.code === 'PGRST301') statusCode = 404; // row not found
  if (err.code === '23505') statusCode = 409;     // unique constraint violation

  // JSON parse errors from malformed request bodies
  if (err.type === 'entity.parse.failed') statusCode = 400;

  // ── Build the response ───────────────────────────────────
  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'         // hide stack details in prod
      : err.message || 'Unknown error';

  res.status(statusCode).json({
    success: false,
    error: message,
    // Include the Postgres error code in dev so it's easy to google
    ...(process.env.NODE_ENV !== 'production' && err.code
      ? { code: err.code }
      : {}),
  });
};

module.exports = { errorHandler };
