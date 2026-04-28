// ============================================================
// src/routes/clusters.js
// Endpoints for hotspot cluster management and heatmap data.
//
// GET  /api/clusters          — list all active clusters
// GET  /api/clusters/:id      — get a single cluster + its needs
// POST /api/clusters/rebuild  — re-cluster all open needs
// ============================================================

const express = require('express');
const router = express.Router();

const {
  getActiveClusters,
  supabase,
} = require('../services/supabaseService');
const { assignToCluster } = require('../services/clusterService');
const { validateId } = require('../middleware/validate');

// ── GET /api/clusters ───────────────────────────────────────
// Returns all active clusters for the heatmap overlay
router.get('/', async (req, res, next) => {
  try {
    const clusters = await getActiveClusters();

    res.json({
      success: true,
      count: clusters.length,
      data: clusters,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/clusters/:id ───────────────────────────────────
// Returns a single cluster with all needs linked to it
router.get('/:id', validateId, async (req, res, next) => {
  try {
    // Fetch the cluster
    const { data: cluster, error: clusterErr } = await supabase
      .from('hotspot_clusters')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (clusterErr) throw clusterErr;

    // Fetch all needs in this cluster
    const { data: needs, error: needsErr } = await supabase
      .from('community_needs')
      .select('id, category, description, urgency_score, status, latitude, longitude, reported_at')
      .eq('cluster_id', req.params.id)
      .order('priority_score', { ascending: false });

    if (needsErr) throw needsErr;

    res.json({
      success: true,
      data: {
        ...cluster,
        needs,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/clusters/rebuild ──────────────────────────────
// Re-run the clustering algorithm on all open needs.
// Useful after tweaking CLUSTER_RADIUS_KM or for batch imports.
// NOTE: This is an admin/maintenance endpoint.
router.post('/rebuild', async (req, res, next) => {
  try {
    // Step 1: Deactivate all existing clusters
    const { error: deactivateErr } = await supabase
      .from('hotspot_clusters')
      .update({ is_active: false })
      .eq('is_active', true);

    if (deactivateErr) throw deactivateErr;

    // Step 2: Clear cluster_id on all needs
    const { error: clearErr } = await supabase
      .from('community_needs')
      .update({ cluster_id: null })
      .not('cluster_id', 'is', null);

    if (clearErr) throw clearErr;

    // Step 3: Fetch all open/assigned/in_progress needs with coordinates
    const { data: needs, error: needsErr } = await supabase
      .from('community_needs')
      .select('*')
      .in('status', ['open', 'assigned', 'in_progress'])
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('reported_at', { ascending: true }); // process oldest first

    if (needsErr) throw needsErr;

    // Step 4: Re-cluster each need
    let clustered = 0;
    for (const need of needs) {
      try {
        await assignToCluster(need);
        clustered++;
      } catch (err) {
        console.error(`⚠️  Failed to cluster need ${need.id}:`, err.message);
      }
    }

    // Step 5: Fetch the new clusters for the response
    const newClusters = await getActiveClusters();

    res.json({
      success: true,
      message: `Re-clustered ${clustered}/${needs.length} needs into ${newClusters.length} clusters`,
      data: {
        needs_processed: needs.length,
        needs_clustered: clustered,
        clusters_created: newClusters.length,
        clusters: newClusters,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
