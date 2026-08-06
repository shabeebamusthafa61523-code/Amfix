import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, LogOut, Briefcase, Shield, Mail, Calendar, Phone, Hash, UserCheck, Loader2, Check, Lock, Key, Settings
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProfileDrawer = ({ isOpen, onClose }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [showSettings, setShowSettings] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState({ show: false, message: '', type: '' });
  
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState({ show: false, message: '', type: '' });

  useEffect(() => {
    if (isOpen) {
      setShowSettings(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordFeedback({ show: false, message: '', type: '' });
      setProfileFeedback({ show: false, message: '', type: '' });
      
      const savedUser = localStorage.getItem('user');
      const userId = localStorage.getItem('user_id');
      const token = localStorage.getItem('token');
      
      let parsedUser = null;
      if (savedUser) {
        try {
          parsedUser = JSON.parse(savedUser);
          setUser(parsedUser); // Quick sync fallback
          setProfileForm({ name: parsedUser?.name || '', email: parsedUser?.email || '' });
        } catch (e) {
          console.warn("Failed to parse cached user data", e);
        }
      }

      if (!token) {
        handleLogout();
        return;
      }

      const activeUserId = userId || parsedUser?.id || parsedUser?._id;
      if (activeUserId) {
        setLoading(true);
        const cleanToken = token.replace(/"/g, '');
        const authHeader = cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`;
        const API_BASE = import.meta.env.VITE_API_URL || '';
        
        fetch(`${API_BASE}/user/${activeUserId}`, {
          headers: { 'Authorization': authHeader }
        })
          .then(res => {
            if (!res.ok) throw new Error("Profile retrieval failed");
            return res.json();
          })
          .then(resData => {
            if (resData.data) {
              setUser(resData.data);
              setProfileForm({ name: resData.data.name || '', email: resData.data.email || '' });
              localStorage.setItem('user', JSON.stringify(resData.data));
            }
          })
          .catch(err => {
            console.error("Profile sync error:", err);
          })
          .finally(() => {
            setLoading(false);
          });
      }
    }
  }, [isOpen]);

  const isProfileChanged = user && (profileForm.name !== user.name || profileForm.email !== user.email);

  const handleUpdateProfile = async () => {
    if (!isProfileChanged) return;
    setIsUpdatingProfile(true);
    setProfileFeedback({ show: false, message: '', type: '' });

    const API_BASE = import.meta.env.VITE_API_URL || '';
    const cleanToken = localStorage.getItem('token')?.replace(/"/g, '') || '';
    const authHeader = cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`;
    const userId = user?.id || user?._id;

    try {
      const res = await fetch(`${API_BASE}/user/update/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: profileForm.name,
          email: profileForm.email
        })
      });

      const result = await res.json();
      if (res.ok && result.data) {
        // Sync local storage and current component user state
        const updatedUser = { ...user, ...result.data };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setProfileFeedback({ show: true, message: 'Profile details updated!', type: 'success' });
        setTimeout(() => {
          setProfileFeedback({ show: false, message: '', type: '' });
        }, 2000);
      } else {
        setProfileFeedback({ show: true, message: result.message || result.detail || 'Update failed.', type: 'error' });
      }
    } catch (e) {
      console.error(e);
      setProfileFeedback({ show: true, message: 'Server or network error.', type: 'error' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const newPassword = passwordForm.newPassword;
  const isLongEnough = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSymbol = /[\W_]/.test(newPassword);
  const matchesConfirm = newPassword && newPassword === passwordForm.confirmPassword;

  const isNewPasswordValid = isLongEnough && hasUppercase && hasLowercase && hasNumber && hasSymbol && matchesConfirm;

  const handleUpdatePassword = async () => {
    if (!isNewPasswordValid) return;
    setIsUpdatingPassword(true);
    setPasswordFeedback({ show: false, message: '', type: '' });

    const API_BASE = import.meta.env.VITE_API_URL || '';
    const cleanToken = localStorage.getItem('token')?.replace(/"/g, '') || '';
    const authHeader = cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`;

    try {
      const res = await fetch(`${API_BASE}/v1/users/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await res.json();
      if (res.ok || data.success) {
        setPasswordFeedback({ show: true, message: 'Password updated successfully!', type: 'success' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => {
          setShowSettings(false);
          setPasswordFeedback({ show: false, message: '', type: '' });
        }, 1500);
      } else {
        setPasswordFeedback({ show: true, message: data.message || data.detail || 'Password update failed.', type: 'error' });
      }
    } catch (e) {
      console.error(e);
      setPasswordFeedback({ show: true, message: 'Server or network error.', type: 'error' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('user_id');
    navigate('/');
    onClose();
  };

  const getDesignationName = () => {
    if (!user) return "N/A";
    return user.designationName || user.designation || "Specialist Agent";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md z-[6000] cursor-pointer"
          />

          {/* Profile Panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-[420px] bg-white/90 dark:bg-[#08090f]/95 backdrop-blur-3xl border-l border-slate-200/80 dark:border-slate-900/60 shadow-[0_0_50px_rgba(0,0,0,0.1)] dark:shadow-[0_0_50px_rgba(0,0,0,0.4)] z-[6010] flex flex-col overflow-hidden"
          >
            {/* Header section */}
            <div className="p-3 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-900/60 bg-white/40 dark:bg-slate-950/20 backdrop-blur-md">
                <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 uppercase">
                   <span className="bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">PROFILE</span>
                </h2>
                {/* <div className="flex items-center gap-2 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-black text-emerald-500 tracking-widest uppercase">SECURE LINK ACTIVE</span>
                </div> */}
              <button 
                onClick={onClose} 
                className="p-3 rounded-2xl bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 hover:text-slate-950 dark:hover:text-slate-200 border border-slate-200/60 dark:border-slate-850 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 group"
              >
                <X size={18} className="transition-transform duration-300 group-hover:rotate-90" />
              </button>
            </div>

            {/* Scrollable details panel */}
            <div className="flex-1 overflow-y-auto px-8 custom-scrollbar">
              {loading && !user ? (
                <div className="h-full flex flex-col items-center justify-center py-20">
                  <Loader2 className="animate-spin text-indigo-500 mb-4" size={36} />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Retrieving Operator Data...</p>
                </div>
              ) : (
                <>
                  {/* Photo Profile Section */}
                  <div className="py-8 flex flex-col items-center border-b border-slate-200/60 dark:border-slate-900/60 relative overflow-hidden">
                    {/* Background Ambient Glow */}
                    {/* <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-indigo-500/10 dark:bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none" />
                    <div className="absolute top-1/3 left-1/3 w-32 h-32 bg-cyan-500/10 dark:bg-cyan-500/5 blur-[60px] rounded-full pointer-events-none" /> */}
                    
                    <div className="relative group cursor-pointer">
                      {/* Premium Multi-layered Glow and Borders */}
                      <div className="absolute -inset-2 rounded-[2.5rem] bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 opacity-20 blur-md group-hover:opacity-40 group-hover:blur-lg transition-all duration-500 animate-pulse" />
                      <div className="absolute -inset-1.5 rounded-[2.3rem] bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 opacity-40 group-hover:opacity-80 transition-all duration-500" />
                      
                      {/* Avatar Container */}
                      <div className="w-28 h-28 rounded-[2.2rem] bg-white dark:bg-slate-950 p-1 overflow-hidden relative shadow-2xl transition-transform duration-500 group-hover:scale-105">
                        <img 
                          src={user?.avatar || user?.profile_image || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=6366f1&color=fff&bold=true`} 
                          alt="Profile Avatar" 
                          className="w-full h-full object-cover rounded-[1.8rem] transition-transform duration-700 group-hover:scale-110" 
                        />
                      </div>
                      
                      {/* Role Icon Overlay Badge */}
                      <div className="absolute -bottom-1 -right-1 p-2.5 bg-indigo-655 rounded-2xl border-4 border-slate-50 dark:border-slate-950 text-white dark:text-slate-950 shadow-lg transition-all duration-300 group-hover:rotate-12">
                        <Shield size={14} className="stroke-[2.5]" />
                      </div>
                    </div>
                    
                    {/* User Name with Gradient Text */}
                    <h3 className="mt-6 text-2xl font-black tracking-tight text-center max-w-[280px] break-words bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-100 dark:via-white dark:to-slate-100 bg-clip-text text-transparent">
                      {user?.name || 'Guest User'}
                    </h3>
                    
                    {/* Role & Status Pill */}
                    <div className="mt-3.5 flex gap-2 items-center">
                      <div className="px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 shadow-sm flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        <span className="text-[9px] font-bold text-slate-600 dark:text-slate-350 uppercase tracking-[0.18em]">
                          {user?.role || 'Operator'}
                        </span>
                      </div>
                      
                      <div className="px-3.5 py-1.5 rounded-full bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/40 shadow-sm">
                        <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.18em]">
                          {user?.status || 'active'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section: Sector & Identity */}
                  <div className="py-6 space-y-3.5">
                    <h4 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-4">Credentials & Sector</h4>
                    
                    <DetailItem 
                      icon={Briefcase} 
                      label="Assigned Sector" 
                      value={getDesignationName()} 
                      iconColor="text-indigo-500"
                      hoverAccent="bg-indigo-500"
                    />
                    
                    <DetailItem 
                      icon={Shield} 
                      label="Division / Department" 
                      value={user?.department || 'General Staff'} 
                      iconColor="text-cyan-500"
                      hoverAccent="bg-cyan-500"
                    />

                    <DetailItem 
                      icon={Hash} 
                      label="Registry Node (ID)" 
                      value={user?.employeeId || 'N/A'} 
                      iconColor="text-emerald-500"
                      hoverAccent="bg-emerald-500"
                    />
                  </div>

                  {/* Section: Contact */}
                  <div className="py-6 border-t border-slate-200/60 dark:border-slate-900/60 space-y-3.5">
                    <h4 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-4">Direct Contact</h4>
                    
                    <DetailItem 
                      icon={Mail} 
                      label="Network Mail" 
                      value={user?.email || 'N/A'} 
                      iconColor="text-purple-500"
                      hoverAccent="bg-purple-500"
                    />

                    <DetailItem 
                      icon={Phone} 
                      label="Secure Line" 
                      value={user?.phone || 'N/A'} 
                      iconColor="text-rose-500"
                      hoverAccent="bg-rose-500"
                    />
                  </div>

                  {/* Section: System Registry */}
                  <div className="py-6 border-t border-slate-200/60 dark:border-slate-900/60 space-y-3.5 pb-10">
                    <h4 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-4">Registry Metadata</h4>
                    
                    <DetailItem 
                      icon={UserCheck} 
                      label="Reporting Officer" 
                      value={user?.reportingManager || 'System Administrator'} 
                      iconColor="text-amber-500"
                      hoverAccent="bg-amber-500"
                    />

                    <DetailItem 
                      icon={Calendar} 
                      label="Onboarding Timestamp" 
                      value={formatDate(user?.joining_date || user?.createdAt)} 
                      iconColor="text-blue-500"
                      hoverAccent="bg-blue-500"
                    />
                  </div>

                  {/* Section: Settings & Security */}
                  <div className="py-6 border-t border-slate-200/60 dark:border-slate-900/60 space-y-3.5 pb-10">
                    <h4 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-4">Settings & Security</h4>
                    
                    {!showSettings ? (
                      <motion.button 
                        whileHover={{ scale: 1.01, y: -1 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setShowSettings(true)}
                        className="w-full py-4.5 bg-gradient-to-r from-slate-100 to-slate-200/80 dark:from-slate-900 dark:to-slate-950 text-slate-700 dark:text-slate-355 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] flex items-center justify-center gap-3 transition-all cursor-pointer border border-slate-200 dark:border-slate-850 shadow-sm hover:shadow-md hover:border-slate-350 dark:hover:border-slate-800 group"
                      >
                        <Settings size={14} className="transition-transform duration-700 group-hover:rotate-90 text-slate-500" />
                        Settings
                      </motion.button>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/60 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 p-6 rounded-3xl space-y-6 shadow-inner"
                      >
                        {/* 1. PROFILE DETAILS FORM */}
                        <div className="space-y-4 pb-4 border-b border-slate-200 dark:border-slate-900">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Settings size={12} className="text-indigo-500" />
                              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Profile Details</span>
                            </div>
                            <button 
                              onClick={() => {
                                setShowSettings(false);
                                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                                setPasswordFeedback({ show: false, message: '', type: '' });
                                setProfileFeedback({ show: false, message: '', type: '' });
                                if (user) {
                                  setProfileForm({ name: user.name || '', email: user.email || '' });
                                }
                              }}
                              className="text-[9px] font-black text-rose-500 hover:text-rose-650 dark:hover:text-rose-400 uppercase tracking-wider cursor-pointer hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider"></span>
                              <input 
                                type="text"
                                value={profileForm.name}
                                onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-850 rounded-2xl pl-16 pr-4 py-3 text-xs focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none text-slate-800 dark:text-slate-100 transition-all font-bold"
                              />
                            </div>

                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider"></span>
                              <input 
                                type="email"
                                value={profileForm.email}
                                onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-850 rounded-2xl pl-16 pr-4 py-3 text-xs focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none text-slate-800 dark:text-slate-100 transition-all font-bold"
                              />
                            </div>
                          </div>

                          {profileFeedback.show && (
                            <p className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg ${
                              profileFeedback.type === 'success' 
                                ? 'text-emerald-500 bg-emerald-500/5 border border-emerald-500/10' 
                                : 'text-rose-500 bg-rose-500/5 border border-rose-500/10'
                            }`}>
                              {profileFeedback.message}
                            </p>
                          )}

                          <motion.button
                            whileHover={isProfileChanged && !isUpdatingProfile ? { scale: 1.01 } : {}}
                            whileTap={isProfileChanged && !isUpdatingProfile ? { scale: 0.99 } : {}}
                            disabled={!isProfileChanged || isUpdatingProfile}
                            onClick={handleUpdateProfile}
                            className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-cyan-550 dark:from-cyan-550 dark:to-cyan-600 text-white font-black rounded-2xl uppercase text-[9px] tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {isUpdatingProfile ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              "Save Profile Changes"
                            )}
                          </motion.button>
                        </div>

                        {/* 2. UPDATE SECURITY PASSWORD FORM */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            {/* <Lock size={12} className="text-indigo-500" /> */}
                            <span className="text-[10px] font-bold text-slate-755 dark:text-slate-350 uppercase tracking-widest">Update Security Key</span>
                          </div>
                          
                          {/* Hidden input for password manager integration */}
                          <input type="hidden" name="email" value={user?.email || ''} autoComplete="username" />

                          <div className="space-y-3">
                            <div className="relative">
                              {/* <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" /> */}
                              <input 
                                type="password"
                                name="current-password"
                                autoComplete="current-password"
                                placeholder="Current Security Password"
                                value={passwordForm.currentPassword}
                                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                                className="w-full bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-850 rounded-2xl pl-10 pr-4 py-3 text-xs focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none text-slate-800 dark:text-slate-100 transition-all placeholder-slate-400 dark:placeholder-slate-500"
                              />
                            </div>

                            <div className="relative">
                              {/* <Key size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" /> */}
                              <input 
                                type="password"
                                name="new-password"
                                autoComplete="new-password"
                                placeholder="New Security Password"
                                value={passwordForm.newPassword}
                                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                className="w-full bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-850 rounded-2xl pl-10 pr-4 py-3 text-xs focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none text-slate-800 dark:text-slate-100 transition-all placeholder-slate-400 dark:placeholder-slate-500"
                              />
                            </div>

                            <div className="relative">
                              {/* <Key size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" /> */}
                              <input 
                                type="password"
                                name="confirm-password"
                                autoComplete="new-password"
                                placeholder="Confirm New Password"
                                value={passwordForm.confirmPassword}
                                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                className="w-full bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-850 rounded-2xl pl-10 pr-4 py-3 text-xs focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none text-slate-800 dark:text-slate-100 transition-all placeholder-slate-400 dark:placeholder-slate-500"
                              />
                            </div>
                          </div>

                          {/* Complexity Rules Display */}
                          {passwordForm.newPassword && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-2.5 overflow-hidden"
                            >
                              <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                Security Metrics Check
                              </span>
                              <Rule met={passwordForm.newPassword.length >= 8} label="Min 8 characters length" />
                              <Rule met={/[A-Z]/.test(passwordForm.newPassword)} label="Includes uppercase (A-Z)" />
                              <Rule met={/[a-z]/.test(passwordForm.newPassword)} label="Includes lowercase (a-z)" />
                              <Rule met={/\d/.test(passwordForm.newPassword)} label="Includes number (0-9)" />
                              <Rule met={/[\W_]/.test(passwordForm.newPassword)} label="Includes symbol (e.g. !@#$%^&*)" />
                              <Rule met={passwordForm.newPassword && passwordForm.newPassword === passwordForm.confirmPassword} label="Verification passwords match" />
                            </motion.div>
                          )}

                          {passwordFeedback.show && (
                            <p className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg ${
                              passwordFeedback.type === 'success' 
                                ? 'text-emerald-500 bg-emerald-500/5 border border-emerald-500/10' 
                                : 'text-rose-500 bg-rose-500/5 border border-rose-500/10'
                            }`}>
                              {passwordFeedback.message}
                            </p>
                          )}

                          <motion.button
                            whileHover={isNewPasswordValid ? { scale: 1.01 } : {}}
                            whileTap={isNewPasswordValid ? { scale: 0.99 } : {}}
                            disabled={isUpdatingPassword || !isNewPasswordValid}
                            onClick={handleUpdatePassword}
                            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-550 dark:from-indigo-500 dark:to-indigo-600 text-white dark:text-slate-950 font-black rounded-2xl uppercase text-[9px] tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {isUpdatingPassword ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              "Commit Password Change"
                            )}
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Logout panel footer */}
            <div className="p-8 bg-gradient-to-t from-slate-50/50 dark:from-[#08090f]/50 to-transparent border-t border-slate-200/60 dark:border-slate-900/60 backdrop-blur-md">
              <motion.button 
                whileHover={{ scale: 1.01, y: -1 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleLogout}
                className="w-full py-4 bg-rose-500/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/20 hover:border-transparent rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm hover:shadow-md hover:shadow-rose-500/20 active:scale-98"
              >
                <LogOut size={14} className="stroke-[2.5]" /> Logout 
              </motion.button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

const DetailItem = ({ icon: Icon, label, value, iconColor, hoverAccent }) => (
  <motion.div 
    whileHover={{ y: -3, scale: 1.015 }}
    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    className="group bg-white/40 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-850 p-4.5 rounded-2xl flex items-center gap-4.5 transition-all duration-300 hover:bg-white/60 dark:hover:bg-slate-900/50 hover:border-slate-355 dark:hover:border-slate-800 hover:shadow-md hover:shadow-indigo-500/2 relative overflow-hidden"
  >
    {/* Left accent hover-reveal color border */}
    <div className={`absolute left-0 top-0 bottom-0 w-1 ${hoverAccent} scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center`} />

    {/* Icon Wrapper with Custom Color Glass Effect */}
    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-955 text-slate-550 dark:text-slate-400 border border-slate-200/50 dark:border-slate-900/50 group-hover:scale-105 group-hover:bg-slate-200/50 dark:group-hover:bg-slate-900/50 transition-all duration-300">
      <Icon size={18} className={`${iconColor} transition-transform duration-300 group-hover:rotate-6`} />
    </div>
    
    <div className="overflow-hidden flex-1 pl-0.5">
      <p className="text-[9px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-[0.16em] leading-none mb-2 transition-colors duration-300 group-hover:text-indigo-500 dark:group-hover:text-indigo-400">
        {label}
      </p>
      <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate tracking-tight">
        {value || 'Not Configured'}
      </p>
    </div>
  </motion.div>
);

const Rule = ({ met, label }) => (
  <div className="flex items-center gap-1.5 text-[10px]">
    <div className={`h-3 w-3 rounded-full flex items-center justify-center border transition-all ${
      met 
        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" 
        : "bg-slate-500/5 border-slate-500/20 text-slate-400 dark:text-slate-500"
    }`}>
      <Check size={8} className={met ? "opacity-100" : "opacity-30"} />
    </div>
    <span className={met ? "text-emerald-500 dark:text-emerald-450 font-semibold" : "text-slate-500 dark:text-slate-400"}>
      {label}
    </span>
  </div>
);

export default ProfileDrawer;