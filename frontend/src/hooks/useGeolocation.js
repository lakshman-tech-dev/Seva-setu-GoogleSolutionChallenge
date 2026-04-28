// ============================================================
// src/hooks/useGeolocation.js
// Live GPS tracking for volunteer location updates.
// Updates volunteer position in Supabase every 5 minutes.
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { updateVolunteer } from '../services/api';

const GEO_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 60_000,
};

const UPDATE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Track the user's GPS position and periodically sync it
 * to the backend volunteer record.
 *
 * @param {string|null} volunteerId - UUID of the volunteer to update
 * @returns {{ coords: {lat, lng}|null, error: string|null, loading: boolean }}
 */
export const useGeolocation = (volunteerId = null) => {
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastSyncRef = useRef(0);

  // Sync coords to the backend (debounced to 5 min intervals)
  const syncToBackend = useCallback(
    async (lat, lng) => {
      if (!volunteerId) return;

      const now = Date.now();
      if (now - lastSyncRef.current < UPDATE_INTERVAL_MS) return;
      lastSyncRef.current = now;

      try {
        await updateVolunteer(volunteerId, { latitude: lat, longitude: lng });
        console.log(`📍 Location synced: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      } catch (err) {
        console.error('Location sync failed:', err.message);
      }
    },
    [volunteerId]
  );

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    const onSuccess = (position) => {
      const { latitude, longitude } = position.coords;
      setCoords({ lat: latitude, lng: longitude });
      setError(null);
      setLoading(false);
      syncToBackend(latitude, longitude);
    };

    const onError = (err) => {
      switch (err.code) {
        case err.PERMISSION_DENIED:
          setError('Location permission denied. Please enable it in settings.');
          break;
        case err.POSITION_UNAVAILABLE:
          setError('Location unavailable. Check your GPS.');
          break;
        case err.TIMEOUT:
          setError('Location request timed out.');
          break;
        default:
          setError('Unable to get your location.');
      }
      setLoading(false);
    };

    // Get initial position
    navigator.geolocation.getCurrentPosition(onSuccess, onError, GEO_OPTIONS);

    // Watch for ongoing position changes
    const watchId = navigator.geolocation.watchPosition(onSuccess, onError, GEO_OPTIONS);

    // Periodic sync interval (in case watchPosition doesn't fire often)
    const intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(onSuccess, () => {}, GEO_OPTIONS);
    }, UPDATE_INTERVAL_MS);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(intervalId);
    };
  }, [syncToBackend]);

  return { coords, error, loading };
};
