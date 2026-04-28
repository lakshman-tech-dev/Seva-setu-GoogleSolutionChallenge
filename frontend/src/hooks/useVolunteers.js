// ============================================================
// src/hooks/useVolunteers.js
// React Query hooks for volunteer data.
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchVolunteers, fetchVolunteerById, updateVolunteer, assignVolunteer, updateTaskStatus } from '../services/api';
import toast from 'react-hot-toast';

/** Fetch all volunteers */
export const useVolunteers = () => {
  return useQuery({
    queryKey: ['volunteers'],
    queryFn: fetchVolunteers,
    refetchInterval: 60_000,
  });
};

/** Fetch single volunteer */
export const useVolunteer = (id) => {
  return useQuery({
    queryKey: ['volunteer', id],
    queryFn: () => fetchVolunteerById(id),
    enabled: !!id,
  });
};

/** Update volunteer fields */
export const useUpdateVolunteer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }) => updateVolunteer(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['volunteers'] });
      toast.success('Profile updated!');
    },
    onError: () => toast.error('Update failed'),
  });
};

/** Assign a volunteer to a need */
export const useAssignVolunteer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ needId, volunteerId }) => assignVolunteer(needId, volunteerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['needs'] });
      qc.invalidateQueries({ queryKey: ['volunteers'] });
      toast.success('Volunteer assigned!');
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Assignment failed'),
  });
};

/** Update task status (accept / complete / fail) */
export const useUpdateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, status }) => updateTaskStatus(taskId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['needs'] });
      qc.invalidateQueries({ queryKey: ['volunteers'] });
      toast.success('Task updated!');
    },
    onError: () => toast.error('Task update failed'),
  });
};
