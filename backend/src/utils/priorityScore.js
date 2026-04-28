// ============================================================
// src/utils/priorityScore.js
//
// Dynamic priority scoring algorithm for CommunityPulse.
//
// FORMULA:
//   raw = (urgency     × 0.40)
//       + (vulnerability × 0.30)
//       + (time_decay    × 0.20)
//       + (cluster       × 0.10)
//
//   priority_score = raw × clusterMultiplier
//
// Each component is normalised to 0–100 before weighting.
// The clusterMultiplier (1.0 – 1.5) amplifies the final score
// when the need belongs to a geographic hotspot.
//
// Final result is capped at 100 and rounded to 2 decimal places.
// ============================================================

// ─────────────────────────────────────────────────────────────
// WEIGHTS  (must sum to 1.0)
// ─────────────────────────────────────────────────────────────
const WEIGHTS = {
  urgency: 0.40,
  vulnerability: 0.30,
  timeDecay: 0.20,
  cluster: 0.10,
};

// ─────────────────────────────────────────────────────────────
// CATEGORY BASE URGENCY
//
// Some categories carry inherent urgency beyond what the AI
// assigns.  This bonus is ADDED to the raw urgency_score before
// the urgency component is calculated (still capped at 100).
//
// Example: a "safety" report at AI urgency 70 becomes 85 after
//          the +15 category boost.
// ─────────────────────────────────────────────────────────────
const CATEGORY_BASE_URGENCY = {
  safety: 15,       // active violence, threats, abuse
  medical: 10,      // health is time-critical
  food: 5,          // basic survival need
  shelter: 5,       // exposure / displacement
  water: 5,         // essential resource
  mental_health: 0,
  education: 0,
  other: 0,
};

// ─────────────────────────────────────────────────────────────
// VULNERABILITY FLAG POINTS
// ─────────────────────────────────────────────────────────────
const VULNERABILITY_POINTS = {
  child: 40,        // minors are highest priority
  disabled: 35,     // mobility/cognitive limitations
  pregnant: 35,     // medical vulnerability
  elderly: 30,      // age-related vulnerability
  alone: 25,        // no support network
};

// ─────────────────────────────────────────────────────────────
// COMPONENT CALCULATORS
// ─────────────────────────────────────────────────────────────

/**
 * Urgency component (0–100).
 * Takes the raw AI urgency score, adds the category base bonus,
 * and clamps to 0–100.
 *
 * @param {number} urgencyScore - 0–100 from AI triage
 * @param {string} category     - need category
 * @returns {number} 0–100
 */
const urgencyComponent = (urgencyScore = 0, category = 'other') => {
  const base = CATEGORY_BASE_URGENCY[category] ?? 0;
  return Math.min(Math.max(urgencyScore + base, 0), 100);
};

/**
 * Vulnerability component (0–100).
 * Sums the point values of all matching flags, capped at 100.
 *
 * @param {string[]} flags - e.g. ['elderly', 'child', 'alone']
 * @returns {number} 0–100
 *
 * @example
 *   vulnerabilityComponent(['child', 'alone'])  // → 65
 *   vulnerabilityComponent(['child', 'elderly', 'disabled'])  // → 100 (capped)
 */
const vulnerabilityComponent = (flags = []) => {
  const total = flags.reduce((sum, flag) => {
    // Unknown flags get 10 points so new flags still contribute
    return sum + (VULNERABILITY_POINTS[flag] ?? 10);
  }, 0);
  return Math.min(total, 100);
};

/**
 * Time-decay component (0–100).
 * INCREASES over time — a need sitting open longer is more urgent.
 *
 * Rate: 2.5 points per hour.
 * A need unaddressed for 40 hours scores the maximum (100).
 *
 * @param {string|Date} reportedAt - ISO timestamp or Date object
 * @returns {number} 0–100
 *
 * @example
 *   // reported 10 hours ago → 25
 *   // reported 40 hours ago → 100
 */
const timeDecayComponent = (reportedAt) => {
  const ageMs = Date.now() - new Date(reportedAt).getTime();

  // Guard against future dates (clock skew, bad input)
  if (ageMs < 0) return 0;

  const ageHours = ageMs / 3_600_000; // ms → hours
  return Math.min(ageHours * 2.5, 100);
};

/**
 * Cluster component (0 or 80).
 * Binary signal: if the need belongs to an active cluster
 * (clusterMultiplier > 1.0), return 80.  Otherwise 0.
 *
 * The actual magnitude of cluster impact is handled by the
 * clusterMultiplier applied at the end.
 *
 * @param {number} clusterMultiplier
 * @returns {number} 0 or 80
 */
const clusterComponent = (clusterMultiplier = 1.0) => {
  return clusterMultiplier > 1.0 ? 80 : 0;
};

// ─────────────────────────────────────────────────────────────
// CLUSTER MULTIPLIER HELPER
// ─────────────────────────────────────────────────────────────

/**
 * Convert a cluster's report_count into a multiplier.
 *
 *   1 report  → 1.00  (no boost)
 *   2-4       → 1.15
 *   5-9       → 1.30
 *   10+       → 1.50
 *
 * @param {number} reportCount - number of needs in the cluster
 * @returns {number} multiplier (1.0 – 1.5)
 */
const getClusterMultiplier = (reportCount = 1) => {
  if (reportCount >= 10) return 1.50;
  if (reportCount >= 5) return 1.30;
  if (reportCount >= 2) return 1.15;
  return 1.0;
};

// ─────────────────────────────────────────────────────────────
// MAIN FUNCTION
// ─────────────────────────────────────────────────────────────

/**
 * Calculate the final priority score for a community need.
 *
 * @param {Object} need
 * @param {number}   need.urgency_score       - 0–100 from AI triage
 * @param {string[]} need.vulnerability_flags  - array of vulnerability flags
 * @param {string|Date} need.reported_at       - when the need was first reported
 * @param {string}   need.category             - need category for base urgency boost
 * @param {number}   [clusterMultiplier=1.0]   - 1.0 (solo) to 1.5 (large cluster)
 * @returns {number} Final priority score (0–100, rounded to 2 decimal places)
 *
 * @example
 *   calculatePriorityScore({
 *     urgency_score: 75,
 *     vulnerability_flags: ['elderly', 'alone'],
 *     reported_at: '2026-04-28T10:00:00Z',
 *     category: 'medical',
 *   }, 1.15);
 *   // → urgency: min(75+10, 100) = 85 × 0.40 = 34.0
 *   //   vulnerability: min(30+25, 100) = 55 × 0.30 = 16.5
 *   //   time_decay: (hours × 2.5) × 0.20  (depends on current time)
 *   //   cluster: 80 × 0.10 = 8.0
 *   //   raw ≈ 34.0 + 16.5 + time + 8.0
 *   //   final = raw × 1.15  (capped at 100)
 */
const calculatePriorityScore = (need, clusterMultiplier = 1.0) => {
  // ── Destructure with safe defaults ────────────────────────
  const {
    urgency_score = 0,
    vulnerability_flags = [],
    reported_at = new Date().toISOString(),
    category = 'other',
  } = need || {};

  // ── Calculate each component (all normalised to 0–100) ────
  const uScore = urgencyComponent(urgency_score, category);
  const vScore = vulnerabilityComponent(vulnerability_flags);
  const tScore = timeDecayComponent(reported_at);
  const cScore = clusterComponent(clusterMultiplier);

  // ── Weighted sum ──────────────────────────────────────────
  const rawScore =
    uScore * WEIGHTS.urgency +
    vScore * WEIGHTS.vulnerability +
    tScore * WEIGHTS.timeDecay +
    cScore * WEIGHTS.cluster;

  // ── Apply cluster multiplier to the raw score ─────────────
  const amplified = rawScore * clusterMultiplier;

  // ── Cap at 100 and round to 2 decimal places ─────────────
  const final = Math.min(amplified, 100);
  return Math.round(final * 100) / 100;
};

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────

module.exports = {
  calculatePriorityScore,
  getClusterMultiplier,
  CATEGORY_BASE_URGENCY,

  // Exported for unit testing individual components
  urgencyComponent,
  vulnerabilityComponent,
  timeDecayComponent,
  clusterComponent,
};
