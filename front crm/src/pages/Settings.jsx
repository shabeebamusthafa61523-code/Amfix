import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Wifi, ShieldCheck, Save, Loader2, RefreshCw, CheckCircle2, AlertCircle, Laptop } from 'lucide-react';
import { useToast } from '../components/ToastProvider';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

const getApiEndpoint = (path) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (API_BASE.endsWith('/v1')) {
    return `${API_BASE}${cleanPath}`;
  }
  if (API_BASE.endsWith('/api')) {
    return `${API_BASE}/v1${cleanPath}`;
  }
  return `${API_BASE}/api/v1${cleanPath}`;
};

const Settings = () => {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [clientIp, setClientIp] = useState('');
  const [requireWifi, setRequireWifi] = useState(false);
  const [officeWifiIps, setOfficeWifiIps] = useState('');

  const getAuthHeaders = useCallback(() => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return {
      'Content-Type': 'application/json',
      'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`
    };
  }, []);

  const fetchWifiSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiEndpoint('/attendance/wifi-settings'), {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setClientIp(data.data.clientIp || '');
        setRequireWifi(Boolean(data.data.requireWifi));
        setOfficeWifiIps(data.data.officeWifiIps || '');
      } else {
        showToast(data.message || 'Failed to fetch Wi-Fi settings', 'error');
      }
    } catch (err) {
      console.error('Error fetching Wi-Fi settings:', err);
      showToast('Error loading Wi-Fi settings.', 'error');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, showToast]);

  useEffect(() => {
    fetchWifiSettings();
  }, [fetchWifiSettings]);

  const handleAutoAddIp = () => {
    if (!clientIp) {
      showToast('Current IP address not detected.', 'error');
      return;
    }

    const currentList = officeWifiIps
      .split(',')
      .map(ip => ip.trim())
      .filter(Boolean);

    if (currentList.includes(clientIp)) {
      showToast(`IP (${clientIp}) is already in the allowed list!`, 'info');
      return;
    }

    const newList = [...currentList, clientIp].join(', ');
    setOfficeWifiIps(newList);
    showToast(`Added current IP (${clientIp}) to allowed list!`, 'success');
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch(getApiEndpoint('/attendance/wifi-settings'), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          requireWifi,
          officeWifiIps
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Wi-Fi Attendance settings saved successfully!', 'success');
        fetchWifiSettings();
      } else {
        showToast(data.message || 'Failed to save Wi-Fi settings.', 'error');
      }
    } catch (err) {
      console.error('Error saving Wi-Fi settings:', err);
      showToast('Error saving settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-3">
        <Loader2 size={36} className="animate-spin text-indigo-600 dark:text-indigo-400" />
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Loading System Settings...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 min-h-screen"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
            <Wifi size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              System & Wi-Fi Settings
            </h1>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
              Configure Wi-Fi attendance verification and network IP security
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-600/25 transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shrink-0"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          <span>Save Changes</span>
        </button>
      </div>

      {/* Current Detected IP Status Card */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <Laptop size={20} />
          </div>
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">Your Current Detected Network IP</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-base font-black text-slate-900 dark:text-slate-100">
                {clientIp || 'Detecting...'}
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 size={10} /> Active Connection
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAutoAddIp}
          className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 self-start md:self-auto"
        >
          <Wifi size={14} />
          <span>Auto-Add Current IP</span>
        </button>
      </div>

      {/* Main Wi-Fi Configuration Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
        {/* Toggle Switch Banner */}
        <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${requireWifi ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 block">
                Require Office Wi-Fi Verification for Attendance
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                When enabled, employees can only mark daily attendance check-in while connected to authorized office Wi-Fi networks.
              </span>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={requireWifi}
              onChange={(e) => setRequireWifi(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-slate-600 peer-checked:bg-emerald-500 shadow-inner"></div>
          </label>
        </div>

        {/* IP Address Textarea Input */}
        <div className="space-y-2">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Allowed Office Wi-Fi IPv4 Addresses
          </label>
          <textarea
            rows={3}
            value={officeWifiIps}
            onChange={(e) => setOfficeWifiIps(e.target.value)}
            placeholder="e.g. 103.15.220.45, 192.168.1.1, 192.168.0.1"
            className="w-full p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
            <AlertCircle size={14} className="text-indigo-500 shrink-0" />
            <span>Enter comma-separated IPv4 addresses. You can add multiple IPs if your office has multiple Wi-Fi routers or gateways.</span>
          </p>
        </div>
      </div>

      {/* Sticky Save Action Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl flex items-center justify-between">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
          Settings are saved to server memory & persisted in <strong className="text-indigo-600 dark:text-indigo-400">backend/.env</strong>.
        </p>
        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={saving}
          className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          <span>Save Settings</span>
        </button>
      </div>
    </motion.div>
  );
};

export default Settings;
