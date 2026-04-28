// ============================================================
// src/pages/Dashboard.jsx
// 3-column coordinator dashboard with priority feed,
// Leaflet map, and stats/cluster panel.
// ============================================================

import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import NeedCard from '../components/NeedCard';
import StatCard from '../components/StatCard';
import ClusterAlert from '../components/ClusterAlert';
import PriorityBadge from '../components/PriorityBadge';
import TrustMap from '../components/TrustMap';
import { useNeeds, useStats, useMapPins } from '../hooks/useNeeds';
import { useRealtimeNeeds } from '../hooks/useRealtime';

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'critical', label: '🔴 Critical' },
];

const CATEGORY_EMOJI = {
  food: '🍚', medical: '🏥', shelter: '🏠', education: '📚',
  water: '💧', safety: '🛡️', mental_health: '🧠', other: '📋',
};

function getPinColor(score) {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f97316';
  if (score >= 40) return '#eab308';
  return '#22c55e';
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('open');
  const [search, setSearch] = useState('');
  const [mapView, setMapView] = useState('needs'); // 'needs' | 'trust'

  // Subscribe to realtime updates
  useRealtimeNeeds();

  // Fetch data
  const statusFilter = activeTab === 'all' ? undefined : activeTab === 'critical' ? 'open' : activeTab;
  const { data: needsData, isLoading: needsLoading } = useNeeds({ status: statusFilter, limit: 100 });
  const { data: statsData } = useStats();
  const { data: pinsData } = useMapPins();

  const stats = statsData?.data || {};
  const pins = pinsData?.data || [];

  // Filter needs
  const filteredNeeds = useMemo(() => {
    let list = needsData?.data || [];

    // Critical filter: only show priority >= 80
    if (activeTab === 'critical') {
      list = list.filter((n) => n.priority_score >= 80);
    }

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (n) =>
          n.description?.toLowerCase().includes(q) ||
          n.category?.toLowerCase().includes(q) ||
          n.raw_input?.toLowerCase().includes(q) ||
          n.location_text?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [needsData, activeTab, search]);

  // Map center — use first pin or default to India
  const mapCenter = pins.length > 0
    ? [pins[0].latitude, pins[0].longitude]
    : [20.5937, 78.9629];

  const exportToCSV = () => {
    if (!filteredNeeds || filteredNeeds.length === 0) return;
    
    const headers = ['ID', 'Date', 'Category', 'Priority', 'Status', 'Description', 'Vulnerability Flags', 'Location'];
    const rows = filteredNeeds.map(need => [
      need.id,
      new Date(need.created_at).toLocaleString(),
      need.category,
      need.priority_score,
      need.status,
      `"${(need.description || '').replace(/"/g, '""')}"`,
      `"${(need.vulnerability_flags || []).join(', ')}"`,
      `"${(need.location_text || '').replace(/"/g, '""')}"`
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `communitypulse_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasSOS = filteredNeeds.some(n => n.priority_score >= 95);

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface-950/80 backdrop-blur-xl border-b border-white/5">
        {hasSOS && (
          <div className="bg-red-600 text-white text-center py-2 font-bold uppercase tracking-wider animate-pulse">
            🚨 SOS EMERGENCY DETECTED: URGENT CRITICAL NEEDS ACTIVE 🚨
          </div>
        )}
        <div className="max-w-[1920px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💙</span>
            <h1 className="text-lg font-bold text-white">CommunityPulse</h1>
            <span className="live-dot w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span className="text-xs text-emerald-400 font-medium">LIVE</span>
          </div>
          <nav className="flex items-center gap-2">
            <button onClick={exportToCSV} className="btn-ghost text-sm">⬇️ Export CSV</button>
            <Link to="/" className="btn-ghost text-sm">Dashboard</Link>
            <Link to="/volunteers" className="btn-ghost text-sm">Volunteers</Link>
            <Link to="/report" className="btn-primary text-sm">+ Report Need</Link>
          </nav>
        </div>
      </header>

      {/* 3-column layout */}
      <div className="max-w-[1920px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 h-[calc(100vh-60px)]">

        {/* ── LEFT: Priority Feed (30%) ──────────────────────── */}
        <aside className="lg:col-span-4 xl:col-span-3 flex flex-col gap-3 min-h-0">
          {/* Search */}
          <input
            type="text"
            placeholder="Search needs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark text-sm"
          />

          {/* Filter tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === tab.key
                    ? 'bg-brand-600 text-white'
                    : 'bg-white/5 text-surface-300 hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Needs list */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {needsLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredNeeds.length === 0 ? (
              <div className="text-center py-20 text-surface-400">
                <p className="text-3xl mb-2">🎉</p>
                <p className="text-sm">No needs matching your filters</p>
              </div>
            ) : (
              filteredNeeds.map((need) => (
                <NeedCard key={need.id} need={need} />
              ))
            )}
          </div>

          {/* Count */}
          <div className="text-xs text-surface-400 text-center py-1">
            Showing {filteredNeeds.length} of {needsData?.count || 0} needs
          </div>
        </aside>

        {/* ── CENTER: Map (40%) ──────────────────────────────── */}
        <main className="lg:col-span-5 xl:col-span-6 flex flex-col gap-3 min-h-0">
          {/* Map view tabs */}
          <div className="flex gap-1.5">
            <button
              onClick={() => setMapView('needs')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                mapView === 'needs'
                  ? 'bg-brand-600 text-white'
                  : 'bg-white/5 text-surface-300 hover:bg-white/10'
              }`}
            >
              📍 Needs Map
            </button>
            <button
              onClick={() => setMapView('trust')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                mapView === 'trust'
                  ? 'bg-brand-600 text-white'
                  : 'bg-white/5 text-surface-300 hover:bg-white/10'
              }`}
            >
              🗺️ Trust Map
            </button>
          </div>

          {mapView === 'needs' ? (
            <>
              <div className="glass-card flex-1 overflow-hidden">
                <MapContainer
                  center={mapCenter}
                  zoom={12}
                  scrollWheelZoom={true}
                  className="w-full h-full rounded-2xl"
                  style={{ minHeight: '400px' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  />
                  {pins.map((pin) => (
                    <CircleMarker
                      key={pin.id}
                      center={[pin.latitude, pin.longitude]}
                      radius={pin.priority_score >= 80 ? 10 : pin.priority_score >= 60 ? 8 : 6}
                      pathOptions={{
                        fillColor: getPinColor(pin.priority_score),
                        fillOpacity: 0.8,
                        color: getPinColor(pin.priority_score),
                        weight: 2,
                        opacity: 0.4,
                      }}
                    >
                      <Popup>
                        <div className="text-sm">
                          <p className="font-bold capitalize mb-1">
                            {CATEGORY_EMOJI[pin.category] || '📋'} {pin.category?.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-gray-400">
                            Priority: {Math.round(pin.priority_score)} • {pin.status}
                          </p>
                          <Link
                            to={`/needs/${pin.id}`}
                            className="text-xs text-blue-400 hover:underline mt-1 inline-block"
                          >
                            View details →
                          </Link>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>
              <div className="text-xs text-surface-400 text-center">
                {pins.length} active pins on map • Dark tiles by CartoDB
              </div>
            </>
          ) : (
            <TrustMap />
          )}
        </main>

        {/* ── RIGHT: Stats + Clusters (30%) ──────────────────── */}
        <aside className="lg:col-span-3 flex flex-col gap-3 min-h-0 overflow-y-auto">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard icon="📥" label="Open Needs" value={stats.total_open} color="red" />
            <StatCard icon="✅" label="Completed Today" value={stats.total_completed_today} color="green" />
            <StatCard icon="👥" label="Volunteers Active" value={stats.total_volunteers_active} color="brand" />
            <StatCard icon="🔥" label="Active Hotspots" value={stats.hotspot_clusters_active} color="orange" />
          </div>

          {/* Avg priority */}
          <div className="glass-card p-4">
            <p className="text-xs text-surface-400 font-semibold uppercase tracking-wide mb-1">
              Avg. Open Priority
            </p>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-white">
                {stats.avg_priority_score_open ?? '—'}
              </span>
              <PriorityBadge score={stats.avg_priority_score_open || 0} showScore={false} />
            </div>
          </div>

          {/* Top categories */}
          {stats.top_categories?.length > 0 && (
            <div className="glass-card p-4">
              <p className="text-xs text-surface-400 font-semibold uppercase tracking-wide mb-3">
                Top Categories
              </p>
              <div className="space-y-2">
                {stats.top_categories.slice(0, 5).map((cat) => (
                  <div key={cat.category} className="flex items-center justify-between">
                    <span className="text-sm text-surface-200 capitalize flex items-center gap-2">
                      <span>{CATEGORY_EMOJI[cat.category] || '📋'}</span>
                      {cat.category?.replace('_', ' ')}
                    </span>
                    <span className="badge bg-white/10 text-surface-200">{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cluster alerts — we reuse stats.hotspot_clusters_active but for real
              data we'd need a separate /api/clusters endpoint. For now show placeholder. */}
          <div className="glass-card p-4">
            <p className="text-xs text-surface-400 font-semibold uppercase tracking-wide mb-3">
              🔥 Cluster Alerts
            </p>
            {stats.hotspot_clusters_active > 0 ? (
              <div className="space-y-2">
                <ClusterAlert cluster={{ category: 'food', report_count: stats.hotspot_clusters_active * 3 }} />
              </div>
            ) : (
              <p className="text-sm text-surface-400 italic">No active clusters</p>
            )}
          </div>

          {/* Quick actions */}
          <div className="glass-card p-4 space-y-2">
            <p className="text-xs text-surface-400 font-semibold uppercase tracking-wide mb-2">
              Quick Actions
            </p>
            <Link to="/report" className="btn-primary w-full text-center block text-sm">
              + Submit New Report
            </Link>
            <Link to="/volunteers" className="btn-ghost w-full text-center block text-sm">
              Manage Volunteers
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
