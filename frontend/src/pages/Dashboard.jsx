// ============================================================
// src/pages/Dashboard.jsx
// 3-column coordinator dashboard with priority feed,
// Leaflet map, and stats/cluster panel.
// ============================================================

import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { 
  Heart, Activity, Users, Flame, LayoutDashboard, 
  UserCircle, PlusCircle, Download, Search, MapPin, 
  Globe, AlertTriangle, Package, Stethoscope, Home, 
  GraduationCap, Droplets, Shield, Brain, ClipboardList 
} from 'lucide-react';
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
  { key: 'critical', label: 'Critical' },
];

const CATEGORY_ICON = {
  food: Package,
  medical: Stethoscope,
  shelter: Home,
  education: GraduationCap,
  water: Droplets,
  safety: Shield,
  mental_health: Brain,
  other: ClipboardList,
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
          <div className="bg-red-600 text-white text-center py-2 font-bold uppercase tracking-wider animate-pulse flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            SOS EMERGENCY DETECTED: URGENT CRITICAL NEEDS ACTIVE
            <AlertTriangle className="w-5 h-5" />
          </div>
        )}
        <div className="max-w-[1920px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="w-6 h-6 text-brand-500 fill-brand-500" />
            <h1 className="text-lg font-bold text-white">CommunityPulse</h1>
            <span className="live-dot w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span className="text-xs text-emerald-400 font-medium uppercase tracking-widest">LIVE</span>
          </div>
          <nav className="flex items-center gap-2">
            <button onClick={exportToCSV} className="btn-ghost text-sm flex items-center gap-2">
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <Link to="/" className="btn-ghost text-sm flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </Link>
            <Link to="/volunteers" className="btn-ghost text-sm flex items-center gap-2">
              <Users className="w-4 h-4" /> Volunteers
            </Link>
            <Link to="/report" className="btn-primary text-sm flex items-center gap-2">
              <PlusCircle className="w-4 h-4" /> Report Need
            </Link>
          </nav>
        </div>
      </header>

      {/* 3-column layout */}
      <div className="max-w-[1920px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 h-[calc(100vh-60px)]">

        {/* ── LEFT: Priority Feed (30%) ──────────────────────── */}
        <aside className="lg:col-span-4 xl:col-span-3 flex flex-col gap-3 min-h-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search needs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-dark text-sm pl-10"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === tab.key
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                    : 'bg-white/5 text-surface-300 hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Needs list */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {needsLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredNeeds.length === 0 ? (
              <div className="text-center py-20 text-surface-400">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-sm">No needs matching your filters</p>
              </div>
            ) : (
              filteredNeeds.map((need) => (
                <NeedCard key={need.id} need={need} />
              ))
            )}
          </div>

          {/* Count */}
          <div className="text-[10px] uppercase tracking-widest text-surface-500 text-center py-1 font-bold">
            Showing {filteredNeeds.length} of {needsData?.count || 0} needs
          </div>
        </aside>

        {/* ── CENTER: Map (40%) ──────────────────────────────── */}
        <main className="lg:col-span-5 xl:col-span-6 flex flex-col gap-3 min-h-0">
          {/* Map view tabs */}
          <div className="flex gap-1.5">
            <button
              onClick={() => setMapView('needs')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                mapView === 'needs'
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                  : 'bg-white/5 text-surface-300 hover:bg-white/10'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" /> Needs Map
            </button>
            <button
              onClick={() => setMapView('trust')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                mapView === 'trust'
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                  : 'bg-white/5 text-surface-300 hover:bg-white/10'
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> Trust Map
            </button>
          </div>

          {mapView === 'needs' ? (
            <>
              <div className="glass-card flex-1 overflow-hidden border-white/5">
                <MapContainer
                  center={mapCenter}
                  zoom={12}
                  scrollWheelZoom={true}
                  className="w-full h-full rounded-2xl grayscale brightness-75 contrast-125"
                  style={{ minHeight: '400px' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  />
                  {pins.map((pin) => {
                    const IconComp = CATEGORY_ICON[pin.category] || ClipboardList;
                    return (
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
                        <Popup className="custom-popup">
                          <div className="text-sm p-1">
                            <p className="font-bold capitalize mb-1 flex items-center gap-2">
                              <IconComp className="w-3.5 h-3.5" /> {pin.category?.replace('_', ' ')}
                            </p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                              Priority: {Math.round(pin.priority_score)} • {pin.status}
                            </p>
                            <Link
                              to={`/needs/${pin.id}`}
                              className="text-xs text-blue-400 hover:text-blue-300 font-bold mt-2 inline-block flex items-center gap-1"
                            >
                              View details <ChevronRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </Popup>
                      </CircleMarker>
                    );
                  })}
                </MapContainer>
              </div>
              <div className="text-[10px] uppercase tracking-widest text-surface-500 text-center font-bold">
                {pins.length} active units tracked • Engine 2.0
              </div>
            </>
          ) : (
            <TrustMap />
          )}
        </main>

        {/* ── RIGHT: Stats + Clusters (30%) ──────────────────── */}
        <aside className="lg:col-span-3 flex flex-col gap-3 min-h-0 overflow-y-auto custom-scrollbar">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard icon={<ClipboardList className="w-5 h-5" />} label="Open Needs" value={stats.total_open} color="red" />
            <StatCard icon={<Activity className="w-5 h-5" />} label="Completed Today" value={stats.total_completed_today} color="green" />
            <StatCard icon={<Users className="w-5 h-5" />} label="Volunteers Active" value={stats.total_volunteers_active} color="brand" />
            <StatCard icon={<Flame className="w-5 h-5" />} label="Active Hotspots" value={stats.hotspot_clusters_active} color="orange" />
          </div>

          {/* Avg priority */}
          <div className="glass-card p-5 border-white/5">
            <p className="text-[10px] text-surface-500 font-bold uppercase tracking-widest mb-2">
              Avg. Severity Index
            </p>
            <div className="flex items-center gap-4">
              <span className="text-4xl font-black text-white">
                {stats.avg_priority_score_open ?? '—'}
              </span>
              <PriorityBadge score={stats.avg_priority_score_open || 0} showScore={false} />
            </div>
          </div>

          {/* Top categories */}
          {stats.top_categories?.length > 0 && (
            <div className="glass-card p-5 border-white/5">
              <p className="text-[10px] text-surface-500 font-bold uppercase tracking-widest mb-4">
                Sector Distribution
              </p>
              <div className="space-y-3">
                {stats.top_categories.slice(0, 5).map((cat) => {
                  const IconComp = CATEGORY_ICON[cat.category] || ClipboardList;
                  return (
                    <div key={cat.category} className="flex items-center justify-between group">
                      <span className="text-sm text-surface-300 capitalize flex items-center gap-3 font-medium">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                          <IconComp className="w-4 h-4 text-brand-400" />
                        </div>
                        {cat.category?.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-bold text-white px-2 py-1 rounded-md bg-white/5">{cat.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cluster alerts */}
          <div className="glass-card p-5 border-white/5">
            <p className="text-[10px] text-surface-500 font-bold uppercase tracking-widest mb-4">
              Anomaly Detection
            </p>
            {stats.hotspot_clusters_active > 0 ? (
              <div className="space-y-2">
                <ClusterAlert cluster={{ category: 'food', report_count: stats.hotspot_clusters_active * 3 }} />
              </div>
            ) : (
              <p className="text-xs text-surface-500 font-medium italic">Scanning for clusters...</p>
            )}
          </div>

          {/* Quick actions */}
          <div className="glass-card p-5 border-white/5 space-y-3">
            <p className="text-[10px] text-surface-500 font-bold uppercase tracking-widest mb-2">
              Command Center
            </p>
            <Link to="/report" className="btn-primary w-full text-center flex items-center justify-center gap-2 text-xs font-bold py-3">
              <PlusCircle className="w-4 h-4" /> New Intake Report
            </Link>
            <Link to="/volunteers" className="btn-ghost w-full text-center flex items-center justify-center gap-2 text-xs font-bold py-3">
              <Users className="w-4 h-4" /> Fleet Management
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
