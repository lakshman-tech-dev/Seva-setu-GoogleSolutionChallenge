// ============================================================
// src/components/TrustMap.jsx
//
// Community Trust Map — Leaflet visualization showing where
// the NGO is effectively helping (green) vs. where gaps
// remain (red), based on beneficiary feedback aggregated
// into geographic grid cells.
//
// Features:
//   - Circle markers sized by response count
//   - Color-coded: green (>70), yellow (40-70), red (<40)
//   - Click popup with "X of Y beneficiaries reported help"
//   - Legend with color explanations
//   - Toggle to show only gap zones (red + yellow)
// ============================================================

import { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

// ── API fetch ───────────────────────────────────────────────
const fetchTrustData = async () => {
  const { data } = await api.get('/trustmap/data');
  return data;
};

// ── Helpers ─────────────────────────────────────────────────
function getTrustColor(score) {
  if (score > 70) return { fill: '#22c55e', stroke: '#16a34a', label: 'Effective' };
  if (score >= 40) return { fill: '#eab308', stroke: '#ca8a04', label: 'Partial' };
  return { fill: '#ef4444', stroke: '#dc2626', label: 'Gap' };
}

function getRadius(total) {
  // Scale: 2 responses → 8px, 20+ responses → 24px
  return Math.min(8 + (total - 2) * 1.5, 24);
}

// ── Component ───────────────────────────────────────────────
export default function TrustMap() {
  const [showGapsOnly, setShowGapsOnly] = useState(false);

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['trustmap'],
    queryFn: fetchTrustData,
    refetchInterval: 120_000, // refresh every 2 minutes
  });

  const cells = response?.data || [];

  // Filter if showing gaps only
  const visibleCells = showGapsOnly
    ? cells.filter((c) => c.trust_score <= 70)
    : cells;

  // Summary stats
  const totalCells = cells.length;
  const gapCells = cells.filter((c) => c.trust_score < 40).length;
  const goodCells = cells.filter((c) => c.trust_score > 70).length;

  // Map center — use first cell or default to India
  const center = cells.length > 0
    ? [cells[0].lat, cells[0].lon]
    : [20.5937, 78.9629];

  return (
    <div className="glass-card overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            🗺️ Community Trust Map
          </h2>
          <p className="text-xs text-surface-400 mt-0.5">
            Beneficiary feedback by area — {totalCells} zone{totalCells !== 1 ? 's' : ''} tracked
          </p>
        </div>

        {/* Gap zone toggle */}
        <button
          onClick={() => setShowGapsOnly(!showGapsOnly)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
            showGapsOnly
              ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
              : 'bg-white/5 text-surface-300 hover:bg-white/10'
          }`}
        >
          {showGapsOnly ? '🔴 Showing Gaps Only' : '🔴 Show Gaps Only'}
        </button>
      </div>

      {/* Loading / error states */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="text-center py-12 text-surface-400">
          <p className="text-2xl mb-2">⚠️</p>
          <p className="text-sm">Failed to load trust map data</p>
        </div>
      )}

      {!isLoading && !error && cells.length === 0 && (
        <div className="text-center py-12 text-surface-400">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm">No feedback data yet</p>
          <p className="text-xs mt-1">Trust zones will appear once at least 2 beneficiary responses are collected per area</p>
        </div>
      )}

      {/* Map */}
      {!isLoading && !error && cells.length > 0 && (
        <div className="flex-1" style={{ minHeight: '400px' }}>
          <MapContainer
            center={center}
            zoom={12}
            scrollWheelZoom={true}
            className="w-full h-full"
            style={{ minHeight: '400px' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {visibleCells.map((cell, i) => {
              const color = getTrustColor(cell.trust_score);
              const radius = getRadius(cell.total);

              return (
                <CircleMarker
                  key={`${cell.lat}-${cell.lon}-${i}`}
                  center={[cell.lat, cell.lon]}
                  radius={radius}
                  pathOptions={{
                    fillColor: color.fill,
                    fillOpacity: 0.6,
                    color: color.stroke,
                    weight: 2,
                    opacity: 0.8,
                  }}
                >
                  <Popup>
                    <div className="text-sm min-w-[180px]">
                      <p className="font-bold mb-1" style={{ color: color.fill }}>
                        {color.label} Zone — {cell.trust_score}%
                      </p>
                      <p className="text-gray-300 text-xs mb-2">
                        <strong>{cell.yes_count}</strong> of <strong>{cell.total}</strong>{' '}
                        beneficiar{cell.total !== 1 ? 'ies' : 'y'} reported their need was met in this area
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-emerald-400">✅ {cell.yes_count} yes</span>
                        <span className="text-red-400">❌ {cell.no_count} no</span>
                      </div>

                      {/* Mini progress bar */}
                      <div className="w-full h-2 bg-gray-700 rounded-full mt-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${cell.trust_score}%`,
                            backgroundColor: color.fill,
                          }}
                        />
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      )}

      {/* Legend + Stats */}
      <div className="p-4 border-t border-white/5 flex items-center justify-between flex-wrap gap-3">
        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <span className="text-surface-400 font-semibold uppercase tracking-wide">Legend:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-surface-300">Effective (&gt;70%)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-surface-300">Partial (40-70%)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-surface-300">Gap (&lt;40%)</span>
          </span>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-3 text-xs text-surface-400">
          <span>✅ {goodCells} effective</span>
          <span>⚠️ {totalCells - goodCells - gapCells} partial</span>
          <span>🔴 {gapCells} gap{gapCells !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
}
