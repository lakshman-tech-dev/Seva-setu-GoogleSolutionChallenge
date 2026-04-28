// ============================================================
// src/server.js — HTTP server entry point
// Loads env vars, starts Express, and handles graceful shutdown.
// ============================================================

// Load .env BEFORE anything else so all modules see the vars
require('dotenv').config();

const app = require('./app');
const { startFeedbackCron } = require('./services/feedbackService');

const PORT = parseInt(process.env.PORT, 10) || 4000;

const server = app.listen(PORT, () => {
  console.log(`🚀 CommunityPulse API running on http://localhost:${PORT}`);
  console.log(`   Health check → http://localhost:${PORT}/health`);
  console.log(`   Environment  → ${process.env.NODE_ENV || 'development'}`);

  // Start the automated feedback SMS cron job
  startFeedbackCron();
});

// ── Graceful shutdown ───────────────────────────────────────
// When Railway / Docker sends SIGTERM, finish in-flight requests
// before exiting so we don't drop connections.
const shutdown = (signal) => {
  console.log(`\n⏳ Received ${signal}. Closing server gracefully…`);
  server.close(() => {
    console.log('✅ Server closed. Goodbye!');
    process.exit(0);
  });

  // Force-kill after 10 seconds if requests are still hanging
  setTimeout(() => {
    console.error('❌ Could not close in time — forcing exit.');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Catch unhandled promise rejections so the process doesn't silently die
process.on('unhandledRejection', (reason) => {
  console.error('🔥 Unhandled Rejection:', reason);
});
