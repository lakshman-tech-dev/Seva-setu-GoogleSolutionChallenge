// ============================================================
// src/services/clusterService.js
// Groups nearby community needs of the same category into
// "hotspot clusters" so the dashboard can show heatmaps and
// coordinators can spot patterns.
//
// Algorithm:
//   For each new need with coordinates, check if any existing
//   active cluster of the same category is within CLUSTER_RADIUS.
//   If yes → add to that cluster (increment count, shift center).
//   If no  → create a new cluster.
// ============================================================

const {
  getActiveClusters,
  createCluster,
  updateCluster,
  updateNeed,
} = require('./supabaseService');
const { calculateDistance } = require('../utils/distanceCalc');
const { calculatePriorityScore, getClusterMultiplier } = require('../utils/priorityScore');

// A need within 1 km of an existing cluster center gets absorbed
const CLUSTER_RADIUS_KM = 1.0;

/**
 * Try to assign a community need to an existing cluster, or
 * create a new one if nothing is nearby.
 *
 * After clustering, the need's priority_score is recalculated
 * with the appropriate cluster multiplier so hotspot needs
 * automatically rise in priority.
 *
 * @param {Object} need - a community_needs row (must have latitude, longitude, category)
 * @returns {Object|null} The cluster row (created or updated), or null if no coords
 */
const assignToCluster = async (need) => {
  // Can't cluster without coordinates
  if (need.latitude == null || need.longitude == null) {
    return null;
  }

  // Fetch all active clusters for the same category
  const allClusters = await getActiveClusters();
  const sameCategoryClusters = allClusters.filter(
    (c) => c.category === need.category
  );

  // Find the nearest cluster within range
  let nearest = null;
  let nearestDist = Infinity;

  for (const cluster of sameCategoryClusters) {
    const dist = calculateDistance(
      need.latitude,
      need.longitude,
      cluster.center_latitude,
      cluster.center_longitude
    );

    if (dist < CLUSTER_RADIUS_KM && dist < nearestDist) {
      nearest = cluster;
      nearestDist = dist;
    }
  }

  let cluster;

  if (nearest) {
    // ── Absorb into existing cluster ─────────────────────────
    // Shift the cluster center toward the new point using a
    // weighted average (existing center has more weight as
    // report_count grows).
    const n = nearest.report_count;
    const newLat = (nearest.center_latitude * n + need.latitude) / (n + 1);
    const newLng = (nearest.center_longitude * n + need.longitude) / (n + 1);

    cluster = await updateCluster(nearest.id, {
      center_latitude: newLat,
      center_longitude: newLng,
      report_count: n + 1,
      last_updated_at: new Date().toISOString(),
    });

    console.log(
      `📌 Need absorbed into cluster ${nearest.id} (count: ${n + 1})`
    );
  } else {
    // ── Create a brand-new cluster ───────────────────────────
    cluster = await createCluster({
      category: need.category,
      center_latitude: need.latitude,
      center_longitude: need.longitude,
      radius_meters: 500,           // default radius
      report_count: 1,
    });

    console.log(`📍 New cluster created: ${cluster.id}`);
  }

  // ── Recalculate priority score with the cluster multiplier ─
  // This makes needs in hotspot areas automatically rise in the
  // priority queue without coordinator intervention.
  const multiplier = getClusterMultiplier(cluster.report_count);
  const updatedPriority = calculatePriorityScore(need, multiplier);

  // Link the need to this cluster AND update its priority score
  await updateNeed(need.id, {
    cluster_id: cluster.id,
    priority_score: updatedPriority,
  });

  return cluster;
};

module.exports = { assignToCluster };
