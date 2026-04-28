// ============================================================
// src/hooks/useRealtime.js
// Supabase Realtime subscription for live dashboard updates.
// ============================================================

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

/**
 * Subscribe to real-time changes on the community_needs table.
 * Automatically invalidates React Query cache and shows toast
 * notifications when new needs arrive or statuses change.
 */
export const useRealtimeNeeds = () => {
  const qc = useQueryClient();

  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('needs-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_needs' },
        (payload) => {
          const need = payload.new;
          toast(`🆕 New ${need.category || 'community'} need reported`, {
            icon: '📥',
            duration: 5000,
          });
          qc.invalidateQueries({ queryKey: ['needs'] });
          qc.invalidateQueries({ queryKey: ['stats'] });
          qc.invalidateQueries({ queryKey: ['mapPins'] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'community_needs' },
        () => {
          qc.invalidateQueries({ queryKey: ['needs'] });
          qc.invalidateQueries({ queryKey: ['stats'] });
          qc.invalidateQueries({ queryKey: ['mapPins'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
};

/**
 * Subscribe to real-time changes on the tasks table (volunteer-facing).
 */
export const useRealtimeTasks = (volunteerId) => {
  const qc = useQueryClient();

  useEffect(() => {
    if (!supabase || !volunteerId) return;

    const channel = supabase
      .channel(`tasks-${volunteerId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `volunteer_id=eq.${volunteerId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            toast('📋 New task assigned to you!', { icon: '🔔', duration: 6000 });
          }
          qc.invalidateQueries({ queryKey: ['needs'] });
          qc.invalidateQueries({ queryKey: ['volunteers'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, volunteerId]);
};
