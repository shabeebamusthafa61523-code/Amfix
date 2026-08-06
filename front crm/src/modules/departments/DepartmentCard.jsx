// src/modules/departments/DepartmentCard.jsx

import React from 'react';
import { Edit3, Trash2, Users, User, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import StatusBadge from '../../components/StatusBadge';

export const DepartmentCard = ({ department, onEdit, onDelete, onViewUsers }) => {
  const { name, code, description, managerId, status, memberCount = 0 } = department;

  // Helper to extract initials for manager avatar
  const getInitials = (user) => {
    if (!user || !user.name) return '??';
    const parts = user.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.01 }}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 100 }}
      className="flex flex-col h-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-[2rem] shadow-xl hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-300 overflow-hidden"
    >
      {/* Header section with Code Badge and Status */}
      <div className="p-6 pb-4 flex items-start justify-between">
        <span className="px-3 py-1 text-[10px] font-black tracking-widest uppercase bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-500/10">
          {code}
        </span>
        <StatusBadge status={status} />
      </div>

      {/* Main Details */}
      <div className="px-6 flex-grow">
        <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight leading-snug line-clamp-1 mb-2">
          {name}
        </h3>
        <p className="text-sm text-slate-400 dark:text-slate-400 font-medium line-clamp-3 mb-6">
          {description || 'No description provided for this department.'}
        </p>

        {/* Team Lead Profile Box */}
        <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/30 dark:border-slate-800/30 mb-6 flex items-center gap-3">
          {managerId ? (
            <>
              {managerId.avatar ? (
                <img
                  src={managerId.avatar}
                  alt={managerId.name}
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-indigo-500/20"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold text-sm flex items-center justify-center ring-2 ring-indigo-500/20">
                  {getInitials(managerId)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-400 font-semibold tracking-wide uppercase">Team Lead</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                  {managerId.name}
                </p>
                <p className="text-[11px] font-semibold text-indigo-500 dark:text-lime-400 truncate">
                  {managerId.designation || 'Department Team Lead'}
                </p>
                {managerId.email && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-550 font-medium truncate">
                    {managerId.email}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-550 flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-700">
                <User size={18} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold tracking-wide uppercase">Team Lead</p>
                <p className="text-sm font-semibold text-slate-400 dark:text-slate-550 italic">
                  Unassigned
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats and Action Footer */}
      <div className="px-6 py-4 bg-slate-50/30 dark:bg-slate-900/40 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold text-xs">
          <Users size={16} className="text-slate-400" />
          <span>{memberCount} {memberCount === 1 ? 'Member' : 'Members'}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewUsers(department)}
            className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-500/10 transition-all duration-300"
            title="View Members"
          >
            <Users size={16} />
          </button>
          <button
            onClick={() => onEdit(department)}
            className="p-2 rounded-xl text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all duration-300"
            title="Edit Department"
          >
            <Edit3 size={16} />
          </button>
          <button
            onClick={() => onDelete(department)}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all duration-300"
            title="Delete Department"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default DepartmentCard;
