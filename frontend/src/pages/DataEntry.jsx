// ============================================================
// src/pages/DataEntry.jsx
// Field worker / web form for submitting community need reports.
// Features: voice input, photo upload, offline support, auto-location.
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSubmitNeed } from '../hooks/useNeeds';
import { useGeolocation } from '../hooks/useGeolocation';
import toast from 'react-hot-toast';

const OFFLINE_KEY = 'communitypulse_offline_queue';

export default function DataEntry() {
  const [rawInput, setRawInput] = useState('');
  const [locationText, setLocationText] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);
  const { coords } = useGeolocation();
  const submitMutation = useSubmitNeed();

  // ── Online/offline detection ────────────────────────────────
  useEffect(() => {
    const goOnline = () => { setIsOnline(true); syncOfflineQueue(); };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  // ── Sync offline queue when back online ─────────────────────
  const syncOfflineQueue = useCallback(async () => {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]');
    if (queue.length === 0) return;

    toast(`📤 Syncing ${queue.length} offline report(s)…`);
    const remaining = [];

    for (const item of queue) {
      try {
        await submitMutation.mutateAsync(item);
      } catch {
        remaining.push(item);
      }
    }

    localStorage.setItem(OFFLINE_KEY, JSON.stringify(remaining));
    if (remaining.length === 0) {
      toast.success('All offline reports synced!');
    } else {
      toast.error(`${remaining.length} report(s) still pending`);
    }
  }, [submitMutation]);

  // ── Voice input (Web Speech API) ────────────────────────────
  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('Speech recognition not supported in this browser');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join('');
      setRawInput(transcript);
    };
    recognition.onerror = () => { setIsListening(false); toast.error('Voice input failed'); };
    recognition.onend = () => setIsListening(false);

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
    toast.success('🎙 Listening…');
  };

  // ── Photo upload ────────────────────────────────────────────
  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  // ── Submit handler ──────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rawInput.trim()) { toast.error('Please describe the need'); return; }

    const payload = {
      raw_input: photoPreview ? `[Photo attached] ${rawInput}` : rawInput,
      source_channel: 'web_form',
      location_text: locationText || undefined,
    };

    if (!isOnline) {
      // Store offline
      const queue = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]');
      queue.push({ ...payload, queued_at: new Date().toISOString() });
      localStorage.setItem(OFFLINE_KEY, JSON.stringify(queue));
      toast.success('📵 Saved offline — will submit when connected');
      resetForm();
      return;
    }

    submitMutation.mutate(payload, {
      onSuccess: (data) => {
        setSubmittedId(data?.data?.id);
        resetForm();
      },
    });
  };

  const resetForm = () => {
    setRawInput('');
    setLocationText('');
    setPhotoPreview(null);
  };

  // ── Success screen ──────────────────────────────────────────
  if (submittedId) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
        <div className="glass-card p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-white mb-2">Report Submitted!</h2>
          <p className="text-surface-300 mb-4">Your community need has been received and is being processed by our AI triage system.</p>
          <div className="bg-surface-900/50 rounded-xl p-3 mb-6">
            <p className="text-xs text-surface-400">Reference ID</p>
            <p className="text-sm text-brand-400 font-mono break-all">{submittedId}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setSubmittedId(null)} className="btn-primary flex-1">Submit Another</button>
            <Link to="/" className="btn-ghost flex-1 text-center">Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="btn-ghost text-sm">← Back</Link>
            <h1 className="text-lg font-bold text-white">📝 Report a Need</h1>
          </div>
          {!isOnline && (
            <span className="badge bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30">
              📵 Offline
            </span>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Text area with voice button */}
          <div className="glass-card p-4">
            <label className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2 block">
              Describe the need you observed *
            </label>
            <div className="relative">
              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="e.g. Family of 5 in Ramesh Nagar has no food since 2 days. Two small children. Need immediate food supply."
                rows={6}
                className="input-dark text-base pr-14 resize-none"
                required
              />
              <button
                type="button"
                onClick={toggleVoice}
                className={`absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-white/10 text-surface-300 hover:bg-white/20'
                }`}
                title={isListening ? 'Stop listening' : 'Start voice input'}
              >
                🎙
              </button>
            </div>
            {isListening && (
              <p className="text-xs text-red-400 mt-1 animate-pulse">● Recording — speak now…</p>
            )}
          </div>

          {/* Photo upload */}
          <div className="glass-card p-4">
            <label className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2 block">
              Photo (optional)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhoto}
              className="hidden"
            />
            {photoPreview ? (
              <div className="relative">
                <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={() => { setPhotoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-white/10 rounded-xl text-surface-400 hover:border-white/20 hover:text-surface-300 transition-all"
              >
                📷 Tap to take photo or choose from gallery
              </button>
            )}
          </div>

          {/* Location */}
          <div className="glass-card p-4">
            <label className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2 block">
              Location
            </label>
            <input
              type="text"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder="e.g. Near Ramesh Nagar temple, Delhi"
              className="input-dark text-sm"
            />
            {coords && (
              <p className="text-xs text-emerald-400 mt-2">
                📍 GPS detected: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitMutation.isPending || !rawInput.trim()}
            className="btn-primary w-full py-4 text-lg font-bold"
          >
            {submitMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing…
              </span>
            ) : isOnline ? (
              '🚀 Submit Report'
            ) : (
              '📵 Save Offline'
            )}
          </button>
        </form>

        {/* Offline queue indicator */}
        {JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]').length > 0 && (
          <div className="mt-4 glass-card p-3 bg-amber-500/5 border-amber-500/20">
            <p className="text-xs text-amber-400">
              📦 {JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]').length} report(s) waiting to sync
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
