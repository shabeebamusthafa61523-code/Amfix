import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, Search, Loader2, ChevronRight, User as UserIcon, 
  Mail, Briefcase, Folder, CheckCircle2, XCircle, Filter
} from 'lucide-react';
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

const SidebarPermissionsPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'configured', 'unconfigured'

  const getAuthHeaders = useCallback(() => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return { 'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}` };
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiEndpoint('/users'), {
        headers: getAuthHeaders()
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Server returned non-JSON response (${res.status})`);
      }
      const data = await res.json();
      if (res.ok && data.data) {
        setUsers(Array.isArray(data.data) ? data.data : []);
      } else {
        showToast(data.message || "Failed to load users", "error");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      showToast("Error loading users.", "error");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const nonSuperAdminUsers = useMemo(() => {
    return users.filter(u => {
      const isSA = u.isSuperAdmin === true || u.is_super_admin === true || u.role === 'superadmin' || u.role_id === '0' || String(u.role).toLowerCase() === 'superadmin';
      return !isSA;
    });
  }, [users]);

  const filteredUsers = nonSuperAdminUsers.filter(u => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q || 
      (u.name || '').toLowerCase().includes(q) || 
      (u.email || '').toLowerCase().includes(q) ||
      (u.department || '').toLowerCase().includes(q) ||
      (u.designation || u.designationName || '').toLowerCase().includes(q);

    if (!matchSearch) return false;

    if (filterType === 'configured') {
      return Array.isArray(u.permissions) && u.permissions.length > 0;
    }
    if (filterType === 'unconfigured') {
      return !u.permissions || u.permissions.length === 0;
    }
    return true;
  });

  const handleConfigureUser = (userId) => {
    navigate(`/permissions/${userId}`);
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-3">
        <Loader2 size={36} className="animate-spin text-indigo-600 dark:text-indigo-400" />
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Loading Users...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Sidebar Permissions
              </h1>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                Configure which sidebar pages each user can access
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20">
            {nonSuperAdminUsers.length} Total Users
          </span>
          <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
            {nonSuperAdminUsers.filter(u => u.permissions && u.permissions.length > 0).length} Configured
          </span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, department, or designation..."
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400 shrink-0" />
          {['all', 'configured', 'unconfigured'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                filterType === type
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Users Grid */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-16">
          <UserIcon size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No users found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredUsers.map((user, idx) => {
            const hasPermissions = Array.isArray(user.permissions) && user.permissions.length > 0;
            const isSA = user.isSuperAdmin || user.role === 'superadmin';
            const deptName = typeof user.departmentId === 'object' ? user.departmentId?.name : (user.department || '');
            const desigName = user.designationName || user.designation || '';

            return (
              <motion.div
                key={user._id || user.id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-lg hover:border-indigo-500/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-lg flex items-center justify-center shadow-sm overflow-hidden shrink-0">
                      {user.avatar || user.profile_image ? (
                        <img src={user.avatar || user.profile_image} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        (user.name || 'U').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">{user.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1 truncate">
                        <Mail size={10} /> {user.email}
                      </p>
                    </div>
                  </div>

                  {isSA ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0 whitespace-nowrap">
                      Super Admin
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0 whitespace-nowrap">
                      {user.role || 'employee'}
                    </span>
                  )}
                </div>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {deptName && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 rounded-lg">
                      <Folder size={10} /> {deptName}
                    </span>
                  )}
                  {desigName && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 rounded-lg">
                      <Briefcase size={10} /> {desigName}
                    </span>
                  )}
                </div>

                {/* Permissions Status */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {isSA ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={12} /> Full Access
                      </span>
                    ) : hasPermissions ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                        <CheckCircle2 size={12} /> {user.permissions.length} pages configured
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <XCircle size={12} /> Default access (role-based)
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleConfigureUser(user._id || user.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-sm transition active:scale-95 cursor-pointer opacity-80 group-hover:opacity-100"
                  >
                    Configure <ChevronRight size={12} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SidebarPermissionsPage;
