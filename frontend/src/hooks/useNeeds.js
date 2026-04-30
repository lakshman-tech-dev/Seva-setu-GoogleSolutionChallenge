// ============================================================
// src/hooks/useNeeds.js
// React Query hooks for community needs data.
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchNeeds, fetchNeedById, submitNeed, updateNeedStatus, fetchStats, fetchMapPins } from '../services/api';
import toast from 'react-hot-toast';

/** Fetch paginated list of needs */
export const useNeeds = (filters = {}) => {
  return useQuery({
    queryKey: ['needs', filters],
    queryFn: () => fetchNeeds(filters),
    refetchInterval: 30_000,
  });
};

/** Fetch a single need by ID */
export const useNeed = (id) => {
  return useQuery({
    queryKey: ['need', id],
    queryFn: () => fetchNeedById(id),
    enabled: !!id,
  });
};

/** Submit a new need */
export const useSubmitNeed = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: submitNeed,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['needs'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['mapPins'] });
      toast.success('Need submitted successfully!');
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Submission failed'),
  });
};

/** Update a need's status */
export const useUpdateNeedStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, notes }) => updateNeedStatus(id, status, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['needs'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Status updated!');
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Update failed'),
  });
};

/** Assign a volunteer to a need (or self-assign) */
export const useAssignNeed = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ needId, volunteerId }) => assignVolunteer(needId, volunteerId),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['need', variables.needId] });
      qc.invalidateQueries({ queryKey: ['needs'] });
    },
  });
};

/** Dashboard summary stats */
export const useStats = () => {
  return useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    refetchInterval: 60_000,
  });
};

/** Map pins for Leaflet */
export const useMapPins = () => {
  return useQuery({
    queryKey: ['mapPins'],
    queryFn: fetchMapPins,
    refetchInterval: 30_000,
  });
};
