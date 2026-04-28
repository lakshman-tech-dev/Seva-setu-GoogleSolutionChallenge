// ============================================================
// src/utils/distanceCalc.js
// Haversine formula — calculates the great-circle distance
// between two GPS coordinates on Earth.
// Returns the distance in **kilometres**.
// ============================================================

/**
 * Convert degrees to radians (Math.PI / 180)
 * @param {number} deg - Angle in degrees
 * @returns {number} Angle in radians
 */
const toRadians = (deg) => (deg * Math.PI) / 180;

// Mean radius of Earth in kilometres
const EARTH_RADIUS_KM = 6371;

/**
 * Calculate distance between two lat/lng points using the
 * Haversine formula.
 *
 * @param {number} lat1 - Latitude of point A
 * @param {number} lon1 - Longitude of point A
 * @param {number} lat2 - Latitude of point B
 * @param {number} lon2 - Longitude of point B
 * @returns {number} Distance in kilometres (rounded to 2 decimals)
 *
 * @example
 *   calculateDistance(28.6139, 77.2090, 28.5244, 77.2167)
 *   // → ~9.97 km (New Delhi → Saket)
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  // Difference in coordinates converted to radians
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  // Haversine of the central angle
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  // Angular distance in radians
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Distance = radius × angle
  const distance = EARTH_RADIUS_KM * c;

  // Round to 2 decimal places for readability
  return Math.round(distance * 100) / 100;
};

module.exports = { calculateDistance };
