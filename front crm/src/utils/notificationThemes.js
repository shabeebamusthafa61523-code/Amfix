export const NOTIFICATION_THEMES = {
  official: {
    id: 'official',
    name: 'Official',
    emoji: '💼',
    banner: 'bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600',
    badgeClass: 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800',
    cardBorder: 'border-indigo-500/30 dark:border-indigo-500/40',
    modalShadow: 'shadow-[0_10px_35px_rgba(79,70,229,0.25)]',
    iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800',
    buttonBg: 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700',
    tagText: 'Official Alert 💼',
    badgeText: 'Official'
  },
  event: {
    id: 'event',
    name: 'Event',
    emoji: '🎉',
    banner: 'bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600',
    badgeClass: 'bg-pink-100 dark:bg-pink-950/80 text-pink-900 dark:text-pink-300 border border-pink-300 dark:border-pink-700',
    cardBorder: 'border-pink-500/60 dark:border-pink-500/60',
    modalShadow: 'shadow-[0_10px_35px_rgba(236,72,153,0.35)]',
    iconBg: 'bg-pink-100 dark:bg-pink-950/80 text-pink-700 dark:text-pink-300 border border-pink-300 dark:border-pink-700',
    buttonBg: 'bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700',
    tagText: 'Event & Celebration 🎉',
    badgeText: 'Event 🎉'
  },
  emergency: {
    id: 'emergency',
    name: 'Emergency',
    emoji: '🚨',
    banner: 'bg-gradient-to-r from-rose-600 via-red-600 to-amber-500',
    badgeClass: 'bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-300 border border-rose-300 dark:border-rose-700',
    cardBorder: 'border-rose-500/60 dark:border-rose-500/60',
    modalShadow: 'shadow-[0_10px_35px_rgba(225,29,72,0.35)]',
    iconBg: 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700',
    buttonBg: 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700',
    tagText: 'Emergency Alert 🚨',
    badgeText: 'Emergency 🚨'
  }
};

export const getNotificationTheme = (catKey) => {
  const key = String(catKey || 'official').toLowerCase().trim();
  if (key === 'urgent') return NOTIFICATION_THEMES.emergency;
  if (['onam', 'eid', 'christmas', 'celebration', 'event'].includes(key)) return NOTIFICATION_THEMES.event;
  return NOTIFICATION_THEMES[key] || NOTIFICATION_THEMES.official;
};
