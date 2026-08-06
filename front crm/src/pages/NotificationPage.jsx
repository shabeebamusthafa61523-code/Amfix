import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Send, 
  User, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Check, 
  Loader2, 
  AlertCircle,
  FileText,
  Filter,
  Users,
  Search,
  X,
  CheckSquare,
  Square
} from 'lucide-react';
import { useToast } from '../components/ToastProvider';

const API_BASE = import.meta.env.VITE_API_URL;

const NotificationPage = () => {
  const { showToast } = useToast();

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState([]); // Array of user ID strings
  const [sending, setSending] = useState(false);

  // Users for Dropdown
  const [userList, setUserList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  // Notifications List State
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  // Notification tab state
  const [activeTab, setActiveTab] = useState('received'); // 'received' | 'assigned_by'

  const currentUser = useMemo(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  }, []);

  const getAuthHeaders = useCallback(() => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return { 
      'Content-Type': 'application/json',
      'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}` 
    };
  }, []);

  // Helper to extract a unique ID for a user object safely
  const getUserId = useCallback((u) => {
    if (!u) return '';
    return String(u._id || u.id || u.user_id || u.email || '');
  }, []);

  // Fetch all users for Assigned To dropdown
  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch(`${API_BASE}/v1/users`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      let usersArr = [];
      if (data.success && Array.isArray(data.data)) {
        usersArr = data.data;
      } else if (Array.isArray(data)) {
        usersArr = data;
      }
      setUserList(usersArr);
    } catch (err) {
      console.error("Failed to load users for notifications:", err);
      showToast("Failed to load users list", "error");
    } finally {
      setLoadingUsers(false);
    }
  }, [getAuthHeaders, showToast]);

  // Fetch Notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoadingNotifications(true);
      const endpoint = activeTab === 'received' 
        ? `${API_BASE}/v1/notifications/my-notifications`
        : `${API_BASE}/v1/notifications`;
        
      const res = await fetch(endpoint, {
        headers: getAuthHeaders()
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.data)) {
        setNotifications(data.data);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
      showToast("Error loading notifications", "error");
    } finally {
      setLoadingNotifications(false);
    }
  }, [activeTab, getAuthHeaders, showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Filter notifications created/sent by logged-in user for "Assigned By" tab
  const displayedNotifications = useMemo(() => {
    if (activeTab === 'assigned_by') {
      const currentUserId = String(currentUser?._id || currentUser?.id || currentUser?.user_id || localStorage.getItem('user_id') || '');
      const currentUserName = (currentUser?.name || currentUser?.username || '').toLowerCase().trim();

      return notifications.filter(n => {
        if (!n) return false;
        const createdById = String(
          typeof n.createdBy === 'object' 
            ? (n.createdBy?._id || n.createdBy?.id || '') 
            : (n.createdBy || n.senderId || n.userId || '')
        );
        if (currentUserId && createdById && createdById === currentUserId) return true;
        if (n.createdByName && currentUserName && n.createdByName.toLowerCase().trim() === currentUserName) return true;
        if (n.createdBy?.name && currentUserName && n.createdBy.name.toLowerCase().trim() === currentUserName) return true;
        return false;
      });
    }
    return notifications;
  }, [notifications, activeTab, currentUser]);

  const formatAssignedTo = (assignedTo) => {
    if (!assignedTo) return 'User';
    if (Array.isArray(assignedTo)) {
      const names = assignedTo.map(u => (typeof u === 'object' ? u.name || u.email : u)).filter(Boolean);
      return names.length > 0 ? names.join(', ') : 'User';
    }
    if (typeof assignedTo === 'object') {
      return assignedTo.name || assignedTo.email || 'User';
    }
    return String(assignedTo);
  };

  // Multi-select User Helper Functions
  const toggleUserSelection = (rawId) => {
    if (!rawId) return;
    const targetId = String(rawId);
    setAssignedTo(prev => 
      prev.includes(targetId) ? prev.filter(id => id !== targetId) : [...prev, targetId]
    );
  };

  const handleSelectAllUsers = () => {
    const allIds = userList.map(u => getUserId(u)).filter(Boolean);
    if (assignedTo.length === allIds.length) {
      setAssignedTo([]);
    } else {
      setAssignedTo(allIds);
    }
  };

  const filteredUsers = userList.filter(u => {
    const q = userSearchQuery.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = (u.name || '').toLowerCase().includes(q);
    const desigMatch = (u.designation || '').toLowerCase().includes(q);
    const roleMatch = (u.role || '').toLowerCase().includes(q);
    return nameMatch || desigMatch || roleMatch;
  });

  // Handle Create/Send Notification
  const handleSendNotification = async (e) => {
    e.preventDefault();

    if (!description.trim()) {
      showToast("Please enter a notification description.", "warning");
      return;
    }

    if (assignedTo.length === 0) {
      showToast("Please select at least one employee in 'Assigned To'.", "warning");
      return;
    }

    try {
      setSending(true);
      const res = await fetch(`${API_BASE}/v1/notifications`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: title.trim() || 'Notification',
          description: description.trim(),
          assignedTo // Array of user ID strings
        })
      });

      const data = await res.json();

      if (data.success) {
        showToast(`Notification sent to ${assignedTo.length} user(s)!`, "success");
        setTitle('');
        setDescription('');
        setAssignedTo([]);
        setIsUserDropdownOpen(false);
        fetchNotifications();
      } else {
        showToast(data.message || "Failed to send notification.", "error");
      }
    } catch (err) {
      console.error("Error sending notification:", err);
      showToast("An error occurred while sending the notification.", "error");
    } finally {
      setSending(false);
    }
  };

  // Mark single as read
  const handleMarkAsRead = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/v1/notifications/${id}/read`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      const data = await res.json();

      if (data.success) {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        showToast("Marked as read", "success");
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/notifications/mark-all-read`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      const data = await res.json();

      if (data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        showToast("All notifications marked as read", "success");
      }
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  // Delete Notification
  const handleDeleteNotification = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/v1/notifications/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();

      if (data.success) {
        setNotifications(prev => prev.filter(n => n._id !== id));
        showToast("Notification deleted", "success");
      }
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/50 dark:border-slate-800/50 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Bell size={24} />
            </div>
            Notification Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Send instant alerts to assigned team members and track notification history.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form: Create Notification (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 shadow-xl relative">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Send size={18} className="text-indigo-600 dark:text-lime-400" />
              Create & Assign Notification
            </h2>

            <form onSubmit={handleSendNotification} className="space-y-4">
              {/* Title / Subject (Placed ABOVE Description) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Title / Subject <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Urgent Task Update"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-800 dark:text-slate-200"
                />
              </div>

              {/* Notification Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Notification Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter detailed notification description..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-800 dark:text-slate-200 resize-y"
                  required
                />
              </div>

              {/* Multi-Select Assigned To */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Assigned To ({assignedTo.length} Selected) <span className="text-rose-500">*</span>
                  </label>
                  {userList.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectAllUsers}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      {assignedTo.length === userList.length ? 'Deselect All' : 'Select All Users'}
                    </button>
                  )}
                </div>

                {/* Selected Chips */}
                {assignedTo.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2 max-h-24 overflow-y-auto p-1 border border-indigo-100 dark:border-indigo-950 rounded-xl bg-indigo-50/30 dark:bg-indigo-950/20">
                    {assignedTo.map(id => {
                      const u = userList.find(user => getUserId(user) === id);
                      if (!u) return null;
                      return (
                        <span 
                          key={id} 
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-sm"
                        >
                          {u.name}
                          <button
                            type="button"
                            onClick={() => toggleUserSelection(id)}
                            className="hover:text-rose-300 transition-colors cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Dropdown Toggle Control */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    disabled={loadingUsers}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-800 dark:text-slate-200 flex items-center justify-between cursor-pointer disabled:opacity-50"
                  >
                    <span className="text-slate-600 dark:text-slate-300 font-medium truncate">
                      {assignedTo.length === 0 
                        ? '-- Select Assigned Employees --' 
                        : `${assignedTo.length} Employee(s) Selected`}
                    </span>
                    <Users size={16} className="text-slate-400 shrink-0 ml-2" />
                  </button>

                  {/* Custom Multi-Select Dropdown Container */}
                  {isUserDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-3 space-y-2 max-h-64 overflow-y-auto">
                      {/* Search box inside dropdown */}
                      <div className="relative mb-2">
                        <input
                          type="text"
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          placeholder="Search users..."
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none pl-8"
                        />
                        <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
                      </div>

                      {filteredUsers.length === 0 ? (
                        <div className="text-xs text-slate-400 text-center py-3">No matching employees found</div>
                      ) : (
                        filteredUsers.map(u => {
                          const uid = getUserId(u);
                          if (!uid) return null;
                          const isSelected = assignedTo.includes(uid);
                          return (
                            <div
                              key={uid}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleUserSelection(uid);
                              }}
                              className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs font-medium transition-all ${
                                isSelected 
                                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold' 
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {isSelected ? (
                                  <CheckSquare size={16} className="text-indigo-600 dark:text-lime-400 shrink-0" />
                                ) : (
                                  <Square size={16} className="text-slate-400 shrink-0" />
                                )}
                                <span>{u.name}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={sending}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {sending ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Sending Notification...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Send Notification {assignedTo.length > 0 ? `(${assignedTo.length})` : ''}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right List: History & Received Notifications (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 shadow-xl space-y-6">
            
            {/* Header & Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('received')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'received'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Assigned To Me
                </button>
                <button
                  onClick={() => setActiveTab('assigned_by')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'assigned_by'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Assigned By
                </button>
              </div>

              {activeTab === 'received' && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 size={14} />
                  Mark All Read
                </button>
              )}
            </div>

            {/* Notifications Feed */}
            {loadingNotifications ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
                <p className="text-xs font-medium text-slate-400">Loading notifications...</p>
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Bell size={24} />
                </div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {activeTab === 'assigned_by' ? 'No notifications sent by you yet' : 'No notifications found'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">There are no notifications in this view currently.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {displayedNotifications.map((n) => (
                  <motion.div
                    key={n._id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-2xl border transition-all relative ${
                      !n.isRead && activeTab === 'received'
                        ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200/60 dark:border-indigo-800/40'
                        : 'bg-slate-50/50 dark:bg-slate-950/50 border-slate-200/40 dark:border-slate-800/40'
                    }`}
                  >
                    {!n.isRead && activeTab === 'received' && (
                      <div className="absolute left-3 top-4 w-2 h-2 rounded-full bg-rose-500 ring-4 ring-rose-500/20" />
                    )}

                    <div className="flex items-start justify-between gap-3 pl-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white">
                            {n.title || 'Notification'}
                          </h4>
                          {!n.isRead && activeTab === 'received' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                              NEW
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                          {n.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 font-medium pt-1">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          
                          {activeTab === 'received' ? (
                            n.createdByName && (
                              <span className="flex items-center gap-1">
                                <User size={12} />
                                Assigned By: {n.createdByName}
                              </span>
                            )
                          ) : (
                            <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold">
                              <Users size={12} />
                              Assigned To: {formatAssignedTo(n.assignedTo)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!n.isRead && activeTab === 'received' && (
                          <button
                            onClick={() => handleMarkAsRead(n._id)}
                            title="Mark as read"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer"
                          >
                            <Check size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteNotification(n._id)}
                          title="Delete notification"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationPage;
