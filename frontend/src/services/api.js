// ============================================================
// src/services/api.js
// Axios instance + typed API functions for all backend endpoints.
// ============================================================

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Needs ───────────────────────────────────────────────────

/** GET /api/needs?status=&category=&limit=&offset= */
export const fetchNeeds = async ({ status, category, limit = 50, offset = 0 } = {}) => {
  const params = { limit, offset };
  if (status) params.status = status;
  if (category) params.category = category;
  const { data } = await api.get('/needs', { params });
  return data;
};

/** GET /api/needs/:id */
export const fetchNeedById = async (id) => {
  const { data } = await api.get(`/needs/${id}`);
  return data;
};

/** POST /api/needs/submit */
export const submitNeed = async (payload) => {
  const { data } = await api.post('/needs/submit', payload);
  return data;
};

/** PATCH /api/needs/:id/status */
export const updateNeedStatus = async (id, status, coordinatorNotes) => {
  const body = { status };
  if (coordinatorNotes) body.coordinator_notes = coordinatorNotes;
  const { data } = await api.patch(`/needs/${id}/status`, body);
  return data;
};

/** GET /api/needs/stats/summary */
export const fetchStats = async () => {
  const { data } = await api.get('/needs/stats/summary');
  return data;
};

/** GET /api/needs/map/pins */
export const fetchMapPins = async () => {
  const { data } = await api.get('/needs/map/pins');
  return data;
};

// ── Volunteers ──────────────────────────────────────────────

/** GET /api/volunteers */
export const fetchVolunteers = async () => {
  const { data } = await api.get('/volunteers');
  return data;
};

/** GET /api/volunteers/:id */
export const fetchVolunteerById = async (id) => {
  const { data } = await api.get(`/volunteers/${id}`);
  return data;
};

/** PATCH /api/volunteers/:id */
export const updateVolunteer = async (id, updates) => {
  const { data } = await api.patch(`/volunteers/${id}`, updates);
  return data;
};

// ── Triage ──────────────────────────────────────────────────

/** POST /api/triage/assign */
export const assignVolunteer = async (needId, volunteerId) => {
  const body = { need_id: needId };
  if (volunteerId) body.volunteer_id = volunteerId;
  const { data } = await api.post('/triage/assign', body);
  return data;
};

/** PATCH /api/triage/task/:id */
export const updateTaskStatus = async (taskId, status) => {
  const { data } = await api.patch(`/triage/task/${taskId}`, { status });
  return data;
};

export default api;
