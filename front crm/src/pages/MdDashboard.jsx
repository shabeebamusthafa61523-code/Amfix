import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/ToastProvider';
import Dashboard from './Dashboard';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const MdDashboard = () => {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }, []);

  const fetchMetrics = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const cleanBase = (API_BASE || '/api').replace(/\/$/, '');
      const endpointUrl = cleanBase.endsWith('/v1') ? `${cleanBase}/md-dashboard` : `${cleanBase}/v1/md-dashboard`;

      const res = await fetch(endpointUrl, {
        headers: getAuthHeaders()
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setData(json.data);
      } else {
        showToast(json.message || 'Failed to load MD Dashboard metrics', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to MD Dashboard service', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthHeaders, showToast]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(() => {
      fetchMetrics(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Dashboard isEmbedded={true} mdData={data} />
    </div>
  );
};

export default MdDashboard;
