// ============================================================
// src/services/supabaseService.js
// Initialises the Supabase client and exports reusable query
// helpers for every table. All database access goes through
// this file — route handlers never import @supabase directly.
// ============================================================

const { createClient } = require('@supabase/supabase-js');

// Use the SERVICE ROLE key so the backend bypasses RLS.
// The anon key is only for the frontend / public reads.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ─────────────────────────────────────────────────────────────
// COMMUNITY NEEDS
// ─────────────────────────────────────────────────────────────

/** Fetch all open/assigned/in_progress needs, ordered by priority */
const getActiveNeeds = async () => {
  const { data, error } = await supabase
    .from('community_needs')
    .select('*')
    .in('status', ['open', 'assigned', 'in_progress'])
    .order('priority_score', { ascending: false });

  if (error) throw error;
  return data;
};

/** Fetch a single need by UUID */
const getNeedById = async (id) => {
  const { data, error } = await supabase
    .from('community_needs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

/** Insert a new community need row */
const createNeed = async (needData) => {
  const { data, error } = await supabase
    .from('community_needs')
    .insert(needData)
    .select()    // return the inserted row
    .single();

  if (error) throw error;
  return data;
};

/** Update specific columns on a need */
const updateNeed = async (id, updates) => {
  const { data, error } = await supabase
    .from('community_needs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/** Fetch all needs (with optional status filter + pagination) */
const getAllNeeds = async ({ status, limit = 50, offset = 0 } = {}) => {
  let query = supabase
    .from('community_needs')
    .select('*', { count: 'exact' })   // also return total count
    .order('priority_score', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
};

// ─────────────────────────────────────────────────────────────
// VOLUNTEERS
// ─────────────────────────────────────────────────────────────

/** Fetch all active + available volunteers */
const getAvailableVolunteers = async () => {
  const { data, error } = await supabase
    .from('volunteers')
    .select('*')
    .eq('is_available', true)
    .eq('is_active', true);

  if (error) throw error;
  return data;
};

/** Fetch a single volunteer by UUID */
const getVolunteerById = async (id) => {
  const { data, error } = await supabase
    .from('volunteers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

/** Register a new volunteer */
const createVolunteer = async (volunteerData) => {
  const { data, error } = await supabase
    .from('volunteers')
    .insert(volunteerData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/** Update volunteer fields */
const updateVolunteer = async (id, updates) => {
  const { data, error } = await supabase
    .from('volunteers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/** Fetch all volunteers with optional filters */
const getAllVolunteers = async ({ active_only = false } = {}) => {
  let query = supabase
    .from('volunteers')
    .select('*')
    .order('reliability_score', { ascending: false });

  if (active_only) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

// ─────────────────────────────────────────────────────────────
// TASKS
// ─────────────────────────────────────────────────────────────

/** Create a new task linking a need to a volunteer */
const createTask = async (taskData) => {
  const { data, error } = await supabase
    .from('tasks')
    .insert(taskData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/** Update task status + timestamps */
const updateTask = async (id, updates) => {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/** Fetch tasks for a specific volunteer */
const getTasksByVolunteer = async (volunteerId) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, community_needs(*)')   // join the need details
    .eq('volunteer_id', volunteerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

/** Fetch tasks for a specific need */
const getTasksByNeed = async (needId) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, volunteers(*)')        // join the volunteer details
    .eq('need_id', needId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

// ─────────────────────────────────────────────────────────────
// HOTSPOT CLUSTERS
// ─────────────────────────────────────────────────────────────

/** Get all active clusters */
const getActiveClusters = async () => {
  const { data, error } = await supabase
    .from('hotspot_clusters')
    .select('*')
    .eq('is_active', true)
    .order('report_count', { ascending: false });

  if (error) throw error;
  return data;
};

/** Upsert a cluster (create or update if already exists for this category+area) */
const upsertCluster = async (clusterData) => {
  const { data, error } = await supabase
    .from('hotspot_clusters')
    .upsert(clusterData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/** Create a new cluster */
const createCluster = async (clusterData) => {
  const { data, error } = await supabase
    .from('hotspot_clusters')
    .insert(clusterData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/** Update cluster fields (e.g. incrementing report_count) */
const updateCluster = async (id, updates) => {
  const { data, error } = await supabase
    .from('hotspot_clusters')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ─────────────────────────────────────────────────────────────
// BENEFICIARY FEEDBACK
// ─────────────────────────────────────────────────────────────

/** Record a yes/no feedback response */
const createFeedback = async (feedbackData) => {
  const { data, error } = await supabase
    .from('beneficiary_feedback')
    .insert(feedbackData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/** Get feedback for a specific need */
const getFeedbackByNeed = async (needId) => {
  const { data, error } = await supabase
    .from('beneficiary_feedback')
    .select('*')
    .eq('need_id', needId);

  if (error) throw error;
  return data;
};

// ─────────────────────────────────────────────────────────────

module.exports = {
  supabase, // export raw client for edge cases

  // Needs
  getActiveNeeds,
  getNeedById,
  createNeed,
  updateNeed,
  getAllNeeds,

  // Volunteers
  getAvailableVolunteers,
  getVolunteerById,
  createVolunteer,
  updateVolunteer,
  getAllVolunteers,

  // Tasks
  createTask,
  updateTask,
  getTasksByVolunteer,
  getTasksByNeed,

  // Clusters
  getActiveClusters,
  upsertCluster,
  createCluster,
  updateCluster,

  // Feedback
  createFeedback,
  getFeedbackByNeed,
};
