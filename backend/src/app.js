// ============================================================
// src/app.js — Express application setup
// Configures middleware, mounts routes, and attaches the
// global error handler. Does NOT start the server (server.js
// does that so we can reuse the app in tests).
// ============================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Route modules
const needsRouter = require('./routes/needs');
const volunteersRouter = require('./routes/volunteers');
const webhooksRouter = require('./routes/webhooks');
const triageRouter = require('./routes/triage');
const clustersRouter = require('./routes/clusters');
const trustmapRouter = require('./routes/trustmap');

// Global error handler
const { errorHandler } = require('./middleware/errorHandler');

// Auth middleware
const { authMiddleware, authorize } = require('./middleware/authMiddleware');

const app = express();

// ── Security headers ────────────────────────────────────────
app.use(helmet());

// ── CORS — allow the Vite frontend (localhost + production) ─
app.use(
  cors({
    origin: [
      'http://localhost:5173',       // Vite dev server
      'http://localhost:3000',       // alternate dev port
      process.env.FRONTEND_URL,      // production Vercel URL
    ].filter(Boolean),               // remove undefined entries
    credentials: true,
  })
);

// ── Request logging (dev format for local, combined for prod) ─
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Body parsers ────────────────────────────────────────────
// 10 MB limit so coordinators can upload photos of need sites
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Health check (used by Railway / uptime monitors) ────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    service: 'CommunityPulse API',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// ── API routes ──────────────────────────────────────────────

// Public webhooks (Twilio needs these to be open)
app.use('/api/webhooks', webhooksRouter);

// Protected routes (Requires valid Supabase login)
app.use('/api/needs', authMiddleware, needsRouter);

// Coordinator-only routes
app.use('/api/volunteers', authMiddleware, authorize('coordinator'), volunteersRouter);
app.use('/api/triage', authMiddleware, authorize('coordinator'), triageRouter);
app.use('/api/clusters', authMiddleware, authorize('coordinator'), clustersRouter);
app.use('/api/trustmap', authMiddleware, authorize('coordinator'), trustmapRouter);

// ── 404 catch-all for unknown routes ────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// ── Global error handler (MUST be last middleware) ──────────
app.use(errorHandler);

module.exports = app;
