// ============================================================
// src/services/matchingService.js
//
// Volunteer matching engine for CommunityPulse.
//
// Three public functions:
//
//   1. findBestVolunteers(need, limit)
//      → Ranks available volunteers by a composite match_score
//        considering distance, skills, reliability, and capacity.
//
//   2. updateReliabilityScore(volunteerId, taskCompleted)
//      → Adjusts a volunteer's reliability via exponential
//        moving average (10% weight per outcome).
//
//   3. checkBurnoutStatus(volunteer)
//      → Returns burnout risk assessment for a volunteer.
// ============================================================

const {
  getAvailableVolunteers,
  getVolunteerById,
  updateVolunteer,
} = require('./supabaseService');
const { calculateDistance } = require('../utils/distanceCalc');

// ─────────────────────────────────────────────────────────────
// CATEGORY → SKILLS MAP
//
// Maps each need category to the volunteer skills that are
// relevant. "other" has an empty array — any volunteer qualifies.
// ─────────────────────────────────────────────────────────────
const CATEGORY_SKILLS_MAP = {
  food: ['food_distribution', 'driving', 'cooking'],
  medical: ['medical', 'first_aid', 'nursing', 'doctor'],
  shelter: ['construction', 'driving', 'logistics'],
  education: ['teaching', 'tutoring', 'counseling'],
  mental_health: ['counseling', 'psychology', 'social_work'],
  water: ['plumbing', 'logistics', 'driving'],
  safety: ['security', 'social_work', 'counseling'],
  other: [],
};

// ─────────────────────────────────────────────────────────────
// BURNOUT GUARD THRESHOLD
//
// Don't assign a volunteer if they've already used 90% of their
// weekly hour limit. This prevents burnout and keeps the
// volunteer pool healthy.
// ─────────────────────────────────────────────────────────────
const BURNOUT_ASSIGNMENT_THRESHOLD = 0.9;

// ─────────────────────────────────────────────────────────────
// SCORE HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Distance score: drops 10 points per km, minimum 0.
 *
 * 0 km  → 100
 * 5 km  → 50
 * 10 km → 0
 * 15 km → 0  (clamped)
 *
 * @param {number} distanceKm - Haversine distance in km
 * @returns {number} 0–100
 */
const distanceScore = (distanceKm) => {
  return Math.max(0, 100 - distanceKm * 10);
};

/**
 * Skill weight: determines how well a volunteer's skills match
 * the need's category.
 *
 * - 50 points if the volunteer has at least one EXACT skill
 *   from the category's skill list.
 * - 30 points if the category is "other" (any volunteer qualifies).
 * - 0 points if no skills match (volunteer will be filtered out
 *   before this runs, but kept for safety).
 *
 * @param {string[]} volunteerSkills - e.g. ['medical', 'driving']
 * @param {string}   category        - need category
 * @returns {number} 0, 30, or 50
 */
const skillWeight = (volunteerSkills = [], category = 'other') => {
  const requiredSkills = CATEGORY_SKILLS_MAP[category] || [];

  // "other" category — anyone qualifies, give 30 baseline
  if (requiredSkills.length === 0) return 30;

  // Check if the volunteer has at least one exact skill match
  const hasExactMatch = requiredSkills.some((skill) =>
    volunteerSkills.includes(skill)
  );

  return hasExactMatch ? 50 : 0;
};

/**
 * Reliability weight: scales volunteer's reliability_score
 * (0.0–1.0) to a 0–30 point contribution.
 *
 * @param {number} reliabilityScore - 0.0 to 1.0
 * @returns {number} 0–30
 */
const reliabilityWeight = (reliabilityScore = 0.75) => {
  return Math.min(Math.max(reliabilityScore, 0), 1) * 30;
};

/**
 * Availability weight: rewards volunteers who still have a
 * large portion of their weekly hours available.
 *
 * Formula: (1 - hours_used / hour_limit) × 20
 * A volunteer at 0% usage gets 20 pts; at 100% gets 0 pts.
 *
 * @param {number} hoursUsed  - hours_this_week
 * @param {number} hourLimit  - weekly_hour_limit
 * @returns {number} 0–20
 */
const availabilityWeight = (hoursUsed = 0, hourLimit = 10) => {
  // Guard against division by zero
  if (hourLimit <= 0) return 0;
  const ratio = Math.min(hoursUsed / hourLimit, 1);
  return (1 - ratio) * 20;
};

/**
 * Composite match score combining all four factors.
 *
 * match_score = distance_score × 0.4
 *             + skill_weight          (50 or 30)
 *             + reliability_weight    (0–30)
 *             + availability_weight   (0–20)
 *
 * Theoretical max: 100×0.4 + 50 + 30 + 20 = 140
 * but practically caps around 100 for most real-world inputs.
 *
 * @returns {number} composite score (higher = better match)
 */
const computeMatchScore = (dScore, sWeight, rWeight, aWeight) => {
  return dScore * 0.4 + sWeight + rWeight + aWeight;
};

// ─────────────────────────────────────────────────────────────
// FUNCTION 1: findBestVolunteers
// ─────────────────────────────────────────────────────────────

/**
 * Find the best available volunteers for a community need.
 *
 * Pipeline:
 *   1. Fetch all volunteers where is_available = true
 *   2. Filter out burnout-risk (hours ≥ 90% of limit)
 *   3. Filter by skill match (must have ≥ 1 relevant skill,
 *      or category is "other")
 *   4. Score each candidate and sort descending
 *   5. Return top `limit` candidates
 *
 * @param {Object} need   - community_needs row (needs category, latitude, longitude)
 * @param {number} [limit=3] - how many top candidates to return
 * @returns {Array<{
 *   volunteer: Object,
 *   match_score: number,
 *   distance_km: number,
 *   breakdown: { distance: number, skill: number, reliability: number, availability: number }
 * }>}
 */
const findBestVolunteers = async (need, limit = 3) => {
  // ── Step 1: Fetch available volunteers ────────────────────
  const volunteers = await getAvailableVolunteers();

  if (volunteers.length === 0) {
    console.warn('⚠️  No available volunteers found for matching.');
    return [];
  }

  const category = need.category || 'other';
  const requiredSkills = CATEGORY_SKILLS_MAP[category] || [];

  // ── Step 2 + 3: Filter, then score ────────────────────────
  const scored = volunteers
    .filter((vol) => {
      // Burnout guard: skip if within 90% of weekly limit
      const hourLimit = vol.weekly_hour_limit || 10;
      const hoursUsed = vol.hours_this_week || 0;
      if (hoursUsed >= hourLimit * BURNOUT_ASSIGNMENT_THRESHOLD) {
        return false;
      }

      // Skill filter: must have ≥ 1 matching skill, unless "other"
      if (requiredSkills.length > 0) {
        const volSkills = vol.skills || [];
        const hasMatch = requiredSkills.some((s) => volSkills.includes(s));
        if (!hasMatch) return false;
      }

      return true;
    })
    .map((vol) => {
      // ── Distance ──────────────────────────────────────────
      let distKm = 10; // fallback: 10 km if coords are missing
      if (
        need.latitude != null &&
        need.longitude != null &&
        vol.latitude != null &&
        vol.longitude != null
      ) {
        distKm = calculateDistance(
          need.latitude, need.longitude,
          vol.latitude, vol.longitude
        );
      }
      const dScore = distanceScore(distKm);

      // ── Skill ─────────────────────────────────────────────
      const sWeight = skillWeight(vol.skills, category);

      // ── Reliability ───────────────────────────────────────
      const rWeight = reliabilityWeight(vol.reliability_score);

      // ── Availability ──────────────────────────────────────
      const aWeight = availabilityWeight(
        vol.hours_this_week,
        vol.weekly_hour_limit
      );

      // ── Composite score ───────────────────────────────────
      const match_score = computeMatchScore(dScore, sWeight, rWeight, aWeight);

      return {
        volunteer: vol,
        match_score: Math.round(match_score * 100) / 100,
        distance_km: distKm,
        breakdown: {
          distance: Math.round(dScore * 100) / 100,
          skill: sWeight,
          reliability: Math.round(rWeight * 100) / 100,
          availability: Math.round(aWeight * 100) / 100,
        },
      };
    })
    // ── Step 4: Sort by match_score descending ───────────────
    .sort((a, b) => b.match_score - a.match_score)
    // ── Step 5: Take top `limit` ─────────────────────────────
    .slice(0, limit);

  return scored;
};

// ─────────────────────────────────────────────────────────────
// FUNCTION 2: updateReliabilityScore
// ─────────────────────────────────────────────────────────────

/**
 * Update a volunteer's reliability score using an exponential
 * moving average (EMA). Each task outcome shifts the score
 * by 10%.
 *
 *   completed: new = (old × 0.9) + (1.0 × 0.1)  → nudges UP
 *   failed:    new = (old × 0.9) + (0.0 × 0.1)  → nudges DOWN
 *
 * This means:
 *   - A perfect volunteer (score 1.0) who completes stays at 1.0
 *   - A 0.75 volunteer who completes goes to 0.775
 *   - A 0.75 volunteer who fails drops to 0.675
 *
 * The score is clamped to [0.0, 1.0] and rounded to 3 decimals.
 *
 * @param {string}  volunteerId   - UUID of the volunteer
 * @param {boolean} taskCompleted - true if the task was completed, false if failed
 * @returns {{ previous_score: number, new_score: number, volunteer_id: string }}
 */
const updateReliabilityScore = async (volunteerId, taskCompleted) => {
  // Fetch the current volunteer record
  const volunteer = await getVolunteerById(volunteerId);
  const oldScore = volunteer.reliability_score ?? 0.75;

  // EMA: 90% memory of past performance + 10% weight of latest outcome
  const outcome = taskCompleted ? 1.0 : 0.0;
  let newScore = oldScore * 0.9 + outcome * 0.1;

  // Clamp to [0.0, 1.0] and round to 3 decimal places
  newScore = Math.min(Math.max(newScore, 0), 1);
  newScore = Math.round(newScore * 1000) / 1000;

  // Persist to Supabase
  await updateVolunteer(volunteerId, {
    reliability_score: newScore,
  });

  console.log(
    `📊 Reliability updated for ${volunteer.name}: ${oldScore} → ${newScore} (${taskCompleted ? 'completed' : 'failed'})`
  );

  return {
    volunteer_id: volunteerId,
    previous_score: oldScore,
    new_score: newScore,
  };
};

// ─────────────────────────────────────────────────────────────
// FUNCTION 3: checkBurnoutStatus
// ─────────────────────────────────────────────────────────────

/**
 * Assess whether a volunteer is at risk of burnout based on
 * their current weekly hour usage.
 *
 * at_risk = true when hours_this_week ≥ 80% of weekly_hour_limit
 *
 * @param {Object} volunteer - volunteer row from Supabase
 * @returns {{
 *   at_risk: boolean,
 *   percentage_used: number,
 *   hours_remaining: number
 * }}
 *
 * @example
 *   checkBurnoutStatus({ hours_this_week: 8, weekly_hour_limit: 10 })
 *   // → { at_risk: true, percentage_used: 80, hours_remaining: 2 }
 */
const checkBurnoutStatus = (volunteer) => {
  const hoursUsed = volunteer.hours_this_week ?? 0;
  const hourLimit = volunteer.weekly_hour_limit ?? 10;

  // Guard against zero/negative limits
  if (hourLimit <= 0) {
    return {
      at_risk: true,
      percentage_used: 100,
      hours_remaining: 0,
    };
  }

  const percentageUsed = Math.min((hoursUsed / hourLimit) * 100, 100);
  const hoursRemaining = Math.max(hourLimit - hoursUsed, 0);

  return {
    at_risk: hoursUsed >= hourLimit * 0.8,
    percentage_used: Math.round(percentageUsed * 100) / 100,
    hours_remaining: Math.round(hoursRemaining * 100) / 100,
  };
};

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────

module.exports = {
  findBestVolunteers,
  updateReliabilityScore,
  checkBurnoutStatus,
  CATEGORY_SKILLS_MAP,

  // Exported for unit testing individual scoring functions
  distanceScore,
  skillWeight,
  reliabilityWeight,
  availabilityWeight,
};
