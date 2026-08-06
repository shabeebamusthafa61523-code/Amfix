import React, { useState, useEffect } from 'react';
import { getCashBook, getExpenseCategories } from '../../services/accountsService';
import { BookOpen, ArrowUpRight, Filter, Search, Calendar, RefreshCw } from 'lucide-react';

const CashBookTab = () => {
  const [cashBookData, setCashBookData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState({ totalOutflow: 0, totalEntries: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchCashBook = async () => {
    setLoading(true);
    setError('');
    try {
      const [cashRes, catRes] = await Promise.all([
        getCashBook({ type: filterType, category: filterCategory, startDate, endDate }),
        getExpenseCategories()
      ]);

      if (cashRes.success) {
        setCashBookData(cashRes.data || []);
        setSummary(cashRes.summary || { totalOutflow: 0, totalEntries: 0 });
      }
      if (catRes.success) {
        setCategories(catRes.data || []);
      }
    } catch (err) {
      console.error('Cash book error:', err);
      setError('Failed to load cash book entries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashBook();
  }, [filterType, filterCategory, startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* Outflow Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Total Money Outflow</p>
            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              ₹{(summary.totalOutflow || 0).toLocaleString('en-IN')}
            </h3>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-xl">
            <ArrowUpRight size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Total Cash Book Transactions</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
              {summary.totalEntries || 0}
            </h3>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 rounded-xl">
            <BookOpen size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Ledger Status</p>
            <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Synchronized & Up-to-date
            </h3>
          </div>
        </div>
      </div>

      {/* Cash Book Main Ledger Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        {/* Header & Filter Toolbar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Cash Book Outflow Ledger
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time audit log of all outgoing payments (Expenses & Salary Payments).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Type filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs"
            >
              <option value="">All Types</option>
              <option value="Expense">Expense Only</option>
              <option value="Salary">Salary Only</option>
            </select>

            {/* Category filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>

            {/* Date Start */}
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs"
            />

            {/* Date End */}
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs"
            />

            <button
              onClick={fetchCashBook}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              title="Refresh Ledger"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-y border-slate-200/60 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3 font-semibold">Date</th>
                <th className="py-3 px-3 font-semibold">Type</th>
                <th className="py-3 px-3 font-semibold">Category</th>
                <th className="py-3 px-3 font-semibold">Paid To / Recipient</th>
                <th className="py-3 px-3 font-semibold">Payment Mode</th>
                <th className="py-3 px-3 font-semibold text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading cash book entries...
                  </td>
                </tr>
              ) : cashBookData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No money outflow entries recorded yet.
                  </td>
                </tr>
              ) : (
                cashBookData.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-3 whitespace-nowrap font-medium text-slate-900 dark:text-slate-100">
                      {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                        item.type === 'Salary' 
                          ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400' 
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                      }`}>
                        {item.type || 'Expense'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-medium">
                      {item.type === 'Salary' ? 'Employee Salary' : (item.categoryName || item.category?.name || 'General')}
                    </td>
                    <td className="py-3.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                      {item.paidTo}
                      {item.description && (
                        <p className="text-[11px] text-slate-400 font-normal line-clamp-1">{item.description}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {item.paymentMode || 'Cash'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-black text-slate-900 dark:text-white whitespace-nowrap">
                      ₹{(item.amount || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CashBookTab;
