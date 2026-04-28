// ============================================================
// src/routes/trustmap.js
//
// Community Trust Map API — aggregates beneficiary feedback
// into geographic grid cells to show where the NGO is
// effectively helping vs. where gaps remain.
//
// GET /api/trustmap/data — grid-cell trust scores for Leaflet
// ============================================================

const express = require('express');
const router = express.Router();
const { supabase } = require('../services/supabaseService');

// ── Grid cell size (in degrees) ─────────────────────────────
// 0.01° ≈ 1.1 km at the equator. This gives a reasonable
// resolution for neighbourhood-level trust mapping.
const CELL_SIZE = 0.01;

// ── Minimum responses to include a cell ─────────────────────
// Cells with fewer than this many responses are excluded to
// avoid noisy single-report dots on the map.
const MIN_RESPONSES = 2;

// ─────────────────────────────────────────────────────────────
// GET /api/trustmap/data
//
// Aggregation algorithm:
//   1. Fetch all completed needs that have coordinates AND feedback
//   2. Snap each need's (lat, lon) to a grid cell:
//        cell_lat = floor(lat / CELL_SIZE) * CELL_SIZE
//        cell_lon = floor(lon / CELL_SIZE) * CELL_SIZE
//   3. Count yes/no per cell
//   4. trust_score = yes_count / (yes_count + no_count) * 100
//   5. Filter cells with total < MIN_RESPONSES
//   6. Return sorted by trust_score ascending (worst gaps first)
//
// Response:
// {
//   success: true,
//   cell_size_degrees: 0.01,
//   data: [
//     { lat, lon, yes_count, no_count, total, trust_score },
//     ...
//   ]
// }
// ─────────────────────────────────────────────────────────────
router.get('/data', async (_req, res, next) => {
  try {
    // ── Step 1: Fetch completed needs with feedback + coords ──
    // We need BOTH the beneficiary_feedback field on the need AND
    // any rows from the beneficiary_feedback table. We'll use both
    // sources to maximize coverage.
    //
    // Source A: community_needs.beneficiary_feedback (inline field)
    const { data: needsWithFeedback, error: needsErr } = await supabase
      .from('community_needs')
      .select('id, latitude, longitude, beneficiary_feedback')
      .eq('status', 'completed')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .not('beneficiary_feedback', 'is', null);

    if (needsErr) throw needsErr;

    // Source B: beneficiary_feedback table (with joined coordinates)
    const { data: feedbackRows, error: fbErr } = await supabase
      .from('beneficiary_feedback')
      .select('need_id, response, community_needs!inner(latitude, longitude)')
      .not('community_needs.latitude', 'is', null)
      .not('community_needs.longitude', 'is', null);

    if (fbErr) throw fbErr;

    // ── Step 2: Build a map of need_id → feedback responses ───
    // This de-duplicates across both sources.
    const feedbackMap = new Map();
    // key = need_id, value = { lat, lon, responses: ['yes','no',...] }

    // Source A: inline feedback
    for (const need of needsWithFeedback) {
      const key = need.id;
      if (!feedbackMap.has(key)) {
        feedbackMap.set(key, {
          lat: need.latitude,
          lon: need.longitude,
          responses: [],
        });
      }
      feedbackMap.get(key).responses.push(need.beneficiary_feedback);
    }

    // Source B: feedback table rows
    for (const row of feedbackRows) {
      const key = row.need_id;
      const coords = row.community_needs;
      if (!coords?.latitude || !coords?.longitude) continue;

      if (!feedbackMap.has(key)) {
        feedbackMap.set(key, {
          lat: coords.latitude,
          lon: coords.longitude,
          responses: [],
        });
      }
      // Only add if not already captured from Source A
      const entry = feedbackMap.get(key);
      if (!entry.responses.includes(row.response)) {
        entry.responses.push(row.response);
      }
    }

    // ── Step 3: Aggregate into grid cells ─────────────────────
    const cellMap = new Map();
    // key = "cellLat|cellLon", value = { lat, lon, yes: n, no: n }

    for (const [, entry] of feedbackMap) {
      // Snap to grid cell
      const cellLat = Math.floor(entry.lat / CELL_SIZE) * CELL_SIZE;
      const cellLon = Math.floor(entry.lon / CELL_SIZE) * CELL_SIZE;
      const cellKey = `${cellLat.toFixed(4)}|${cellLon.toFixed(4)}`;

      if (!cellMap.has(cellKey)) {
        cellMap.set(cellKey, {
          // Use cell center for display (add half cell size)
          lat: cellLat + CELL_SIZE / 2,
          lon: cellLon + CELL_SIZE / 2,
          yes_count: 0,
          no_count: 0,
        });
      }

      const cell = cellMap.get(cellKey);
      for (const r of entry.responses) {
        if (r === 'yes') cell.yes_count++;
        else if (r === 'no') cell.no_count++;
      }
    }

    // ── Step 4: Compute trust scores and filter ───────────────
    const cells = [];
    for (const [, cell] of cellMap) {
      const total = cell.yes_count + cell.no_count;
      if (total < MIN_RESPONSES) continue;

      cells.push({
        lat: Math.round(cell.lat * 10000) / 10000,
        lon: Math.round(cell.lon * 10000) / 10000,
        yes_count: cell.yes_count,
        no_count: cell.no_count,
        total,
        trust_score: Math.round((cell.yes_count / total) * 100),
      });
    }

    // Sort: worst gaps first so the frontend can highlight them
    cells.sort((a, b) => a.trust_score - b.trust_score);

    res.json({
      success: true,
      cell_size_degrees: CELL_SIZE,
      min_responses: MIN_RESPONSES,
      count: cells.length,
      data: cells,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
