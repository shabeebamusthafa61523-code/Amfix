import React from 'react';
import { LayoutGrid, Table } from 'lucide-react';

const ClientViewSwitcher = ({ viewMode, onViewChange }) => {
  return (
    <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
      <button
        type="button"
        onClick={() => onViewChange('grid')}
        title="Switch to Grid View"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
          viewMode === 'grid'
            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md shadow-slate-200/50 dark:shadow-none scale-[1.02]'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        <span>Grid View</span>
      </button>

      <button
        type="button"
        onClick={() => onViewChange('table')}
        title="Switch to Table View"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
          viewMode === 'table'
            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md shadow-slate-200/50 dark:shadow-none scale-[1.02]'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <Table className="w-3.5 h-3.5" />
        <span>Table View</span>
      </button>
    </div>
  );
};

export default ClientViewSwitcher;
