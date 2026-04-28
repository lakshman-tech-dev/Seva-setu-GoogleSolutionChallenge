// ============================================================
// src/services/geocodingService.js
// Converts location text → latitude/longitude coordinates
// using the OpenCage Geocoding API (free tier: 2,500 req/day).
// ============================================================

const axios = require('axios');

const OPENCAGE_BASE_URL = 'https://api.opencagedata.com/geocode/v1/json';

/**
 * Geocode a free-text location string into lat/lng coordinates.
 * Biases results toward India by default (country code hint).
 *
 * @param {string} locationText - e.g. "near Saket metro, New Delhi"
 * @returns {{ latitude: number, longitude: number, formatted: string } | null}
 *   Returns null if the location couldn't be resolved.
 */
const geocodeLocation = async (locationText) => {
  // Skip empty input
  if (!locationText || locationText.trim().length === 0) return null;

  const apiKey = process.env.GEOCODING_API_KEY;
  if (!apiKey) {
    console.warn('⚠️  GEOCODING_API_KEY not set — skipping geocoding.');
    return null;
  }

  try {
    const response = await axios.get(OPENCAGE_BASE_URL, {
      params: {
        q: locationText,
        key: apiKey,
        limit: 1,                      // we only need the best match
        no_annotations: 1,             // skip extra metadata to save bandwidth
        countrycode: 'in',             // bias toward India
        language: 'en',                // return names in English
      },
      timeout: 5000,                   // 5-second timeout
    });

    const results = response.data.results;

    if (!results || results.length === 0) {
      console.warn(`⚠️  Geocoding returned no results for: "${locationText}"`);
      return null;
    }

    const best = results[0];
    return {
      latitude: best.geometry.lat,
      longitude: best.geometry.lng,
      formatted: best.formatted,       // cleaned-up address string
    };
  } catch (err) {
    // Don't crash the whole request if geocoding fails — the need
    // can still be recorded without coordinates.
    console.error('❌ Geocoding error:', err.message);
    return null;
  }
};

module.exports = { geocodeLocation };
