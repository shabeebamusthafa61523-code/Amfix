import React, { useState, useEffect, useCallback } from 'react';
import { Search, Bell, User, LogOut, Sun, Moon, Menu } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import ProfileDrawer from './ProfileDrawer';
import NotificationPopover from './NotificationPopover';
import { AiAnalyzeButton, AiAnalyzeModal } from './AiAnalyzeModal';

const API_BASE = import.meta.env.VITE_API_URL;

const Navbar = ({ isSidebarCollapsed, toggleMobileSidebar }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPageAiOpen, setIsPageAiOpen] = useState(false);
  const [pageContextData, setPageContextData] = useState(null);

  const location = useLocation();

  const pathName = location.pathname.substring(1);
  const pageTitle = pathName
    ? pathName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : 'Dashboard';
  
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // State for scroll visibility tracking (only show on back scrolling)
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= 10) {
        setIsVisible(true);
        setLastScrollY(currentScrollY);
        return;
      }

      if (Math.abs(currentScrollY - lastScrollY) < 5) {
        return;
      }

      if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // State for the logged-in user
  const [currentUser, setCurrentUser] = useState({
    name: 'Guest',
    role: 'User'
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setCurrentUser({
          name: parsedUser.name || 'User',
          role: parsedUser.role?.name || 'Staff'
        });
      } catch (err) {
        console.error("Failed to parse user data", err);
      }
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

  // Fetch notifications for the current logged in user
  const fetchMyNotifications = useCallback(async () => {
    try {
      const rawToken = localStorage.getItem('token');
      if (!rawToken) return;

      const res = await fetch(`${API_BASE}/v1/notifications/my-notifications`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setNotifications(data.data);
        setUnreadCount(data.unreadCount || data.data.filter(n => !n.isRead).length);
      }
    } catch (err) {
      console.error("Failed to fetch my notifications in Navbar:", err);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchMyNotifications();
    // Poll for notifications every 30 seconds
    const interval = setInterval(fetchMyNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchMyNotifications]);

  const handleMarkAsRead = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/v1/notifications/${id}/read`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/notifications/mark-all-read`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  return (
    <>
      <header className={`fixed top-0 right-0 z-30 h-16 flex items-center justify-between px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 transition-all duration-300 transform ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      } ${isSidebarCollapsed ? 'lg:left-20' : 'lg:left-64'} left-0`}>
        
        {/* Left Side: Mobile Hamburger */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMobileSidebar}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors lg:hidden cursor-pointer"
            title="Open Menu"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Right Section Container */}
        <section className="flex items-center gap-2 relative">

          {/* Universal AI Page Analyzer (Outside of card) */}
          <AiAnalyzeButton
            onClick={() => {
              let pageText = "";
              try {
                const mainEl = document.querySelector('main');
                if (mainEl) {
                  pageText = mainEl.innerText.replace(/\s+/g, ' ').slice(0, 7000);
                }
              } catch (e) {
                console.error("Failed to extract page context for AI", e);
              }
              setPageContextData({
                pageTitle: pageTitle,
                pathname: location.pathname,
                visiblePageSummary: pageText
              });
              setIsPageAiOpen(true);
            }}
            label="AI Analyze Page"
          />

          {/* Right Actions Card (Notification Bell, Theme, Profile) */}
          <div className="flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/30 dark:border-slate-800/30 p-1 rounded-xl shadow-sm transition-colors relative">

            {/* Bell Icon Notification Trigger */}
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-lime-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all cursor-pointer relative"
              title="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse" />
              )}
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-lime-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all cursor-pointer relative"
              title="Toggle theme"
            >
              <motion.div
                initial={false}
                animate={{ rotate: isDark ? 180 : 0, scale: isDark ? 0.95 : 1 }}
                transition={{ duration: 0.3 }}
              >
                {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
              </motion.div>
            </button>

            <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1"></div>

            {/* Profile Trigger */}
            <div
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 p-1 group cursor-pointer"
              title={currentUser.name}
            >
              <div className="relative w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:border-indigo-500/50 group-hover:bg-indigo-500/10 dark:group-hover:bg-indigo-500/20 transition-all shadow-sm overflow-hidden">
                <User size={16} />
              </div>
            </div>

            {/* Notification Popover Dropdown */}
            <NotificationPopover
              isOpen={isNotificationOpen}
              onClose={() => setIsNotificationOpen(false)}
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onMarkAllRead={handleMarkAllRead}
            />
          </div>
        </section>

      </header>

      {/* Profile Drawer */}
      <ProfileDrawer
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={currentUser}
      />

      {/* Universal Page AI Analyze Modal */}
      <AiAnalyzeModal
        isOpen={isPageAiOpen}
        onClose={() => setIsPageAiOpen(false)}
        contextData={pageContextData}
        title={`AI Analysis: ${pageTitle}`}
      />
    </>
  );
};

export default Navbar;