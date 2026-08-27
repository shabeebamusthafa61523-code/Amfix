import React, { useState, useEffect, useMemo } from 'react';
import { getCashBook, getExpenseCategories } from '../../services/accountsService';
import { 
  BookOpen, 
  ArrowDownLeft,
  ArrowUpRight, 
  RefreshCw, 
  FileSpreadsheet, 
  FileText, 
  Wallet, 
  CreditCard,
  Search,
  Filter,
  Loader2,
  TrendingUp,
  TrendingDown,
  Coins
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const CashBookTab = () => {
  const [cashBookData, setCashBookData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, netBalance: 0, totalEntries: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Sorting
  const [entryTypeFilter, setEntryTypeFilter] = useState(''); // '' (All), 'INCOME', 'EXPENSE'
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMode, setFilterMode] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCashBook = async () => {
    setLoading(true);
    setError('');
    try {
      const [cashRes, catRes] = await Promise.all([
        getCashBook({ entryType: entryTypeFilter, type: filterType, category: filterCategory, paymentMode: filterMode, startDate, endDate }),
        getExpenseCategories()
      ]);

      if (cashRes.success) {
        setCashBookData(cashRes.data || []);
        setSummary(cashRes.summary || { totalIncome: 0, totalExpense: 0, netBalance: 0, totalEntries: 0 });
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
  }, [entryTypeFilter, filterType, filterCategory, filterMode, startDate, endDate]);

  // Client-side search & sorting logic
  const filteredAndSortedData = useMemo(() => {
    let data = [...cashBookData];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      data = data.filter(item => 
        (item.paidTo || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (item.type || '').toLowerCase().includes(q) ||
        (item.categoryName || '').toLowerCase().includes(q) ||
        (item.entryType || '').toLowerCase().includes(q)
      );
    }

    if (sortBy === 'date-desc') {
      return data.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    if (sortBy === 'date-asc') {
      return data.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    if (sortBy === 'amount-desc') {
      return data.sort((a, b) => (b.amount || 0) - (a.amount || 0));
    }
    if (sortBy === 'amount-asc') {
      return data.sort((a, b) => (a.amount || 0) - (b.amount || 0));
    }
    return data;
  }, [cashBookData, searchTerm, sortBy]);

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredAndSortedData.length === 0) {
      alert('No cash book records to export.');
      return;
    }

    const exportData = filteredAndSortedData.map((item, idx) => ({
      'S.No': idx + 1,
      'Date': new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      'Entry Type': item.entryType === 'INCOME' ? 'INCOME (INFLOW)' : 'EXPENSE (OUTFLOW)',
      'Category / Dept': item.categoryName || 'General',
      'Party / Source': item.paidTo || 'N/A',
      'Payment Mode': item.paymentMode || 'Cash',
      'Inflow Amount (INR)': item.entryType === 'INCOME' ? (item.amount || 0) : 0,
      'Outflow Amount (INR)': item.entryType === 'EXPENSE' ? (item.amount || 0) : 0,
      'Description / Notes': item.description || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cash Book Income & Expense');

    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 15 },
      { wch: 20 },
      { wch: 22 },
      { wch: 28 },
      { wch: 15 },
      { wch: 18 },
      { wch: 18 },
      { wch: 35 }
    ];

    XLSX.writeFile(workbook, `Cash_Book_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (filteredAndSortedData.length === 0) {
      alert('No cash book records to export.');
      return;
    }

    const doc = new jsPDF('p', 'pt', 'a4');

    doc.setFontSize(15);
    doc.setTextColor(30, 41, 59);
    doc.text('CASH BOOK LEDGER (INCOME & EXPENSE) REPORT', 40, 40);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 40, 55);
    doc.text(`Total Income: RS. ${(summary.totalIncome || 0).toLocaleString('en-IN')} | Total Expense: RS. ${(summary.totalExpense || 0).toLocaleString('en-IN')} | Net Balance: RS. ${(summary.netBalance || 0).toLocaleString('en-IN')}`, 40, 68);

    const tableRows = filteredAndSortedData.map((item, idx) => [
      idx + 1,
      new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      item.entryType === 'INCOME' ? 'INCOME' : 'EXPENSE',
      item.categoryName || 'General',
      item.paidTo || 'N/A',
      item.paymentMode || 'Cash',
      item.entryType === 'INCOME' ? `+ RS. ${(item.amount || 0).toLocaleString('en-IN')}` : '-',
      item.entryType === 'EXPENSE' ? `- RS. ${(item.amount || 0).toLocaleString('en-IN')}` : '-'
    ]);

    autoTable(doc, {
      startY: 85,
      head: [['#', 'Date', 'Type', 'Category / Dept', 'Party / Source', 'Mode', 'Inflow (₹)', 'Outflow (₹)']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85]
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 65 },
        2: { cellWidth: 55 },
        3: { cellWidth: 85 },
        4: { cellWidth: 125 },
        5: { cellWidth: 55 },
        6: { cellWidth: 65, halign: 'right' },
        7: { cellWidth: 65, halign: 'right' }
      }
    });

    doc.save(`Cash_Book_Ledger_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Sleek 1-Row Compact Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Income Stat Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-2xl p-3 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total Income (Inflow)</p>
            <h3 className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              +₹{(summary.totalIncome || 0).toLocaleString('en-IN')}
            </h3>
          </div>
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-xl shrink-0">
            <ArrowDownLeft size={16} />
          </div>
        </div>

        {/* Total Expense Stat Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-2xl p-3 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total Expense (Outflow)</p>
            <h3 className="text-base font-black text-rose-600 dark:text-rose-400 mt-0.5">
              -₹{(summary.totalExpense || summary.totalOutflow || 0).toLocaleString('en-IN')}
            </h3>
          </div>
          <div className="p-2 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-xl shrink-0">
            <ArrowUpRight size={16} />
          </div>
        </div>

        {/* Net Balance Stat Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-2xl p-3 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Net Cash Flow</p>
            <h3 className={`text-base font-black mt-0.5 ${
              (summary.netBalance || 0) >= 0 
                ? 'text-indigo-600 dark:text-indigo-400' 
                : 'text-rose-600 dark:text-rose-400'
            }`}>
              ₹{(summary.netBalance || 0).toLocaleString('en-IN')}
            </h3>
          </div>
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 rounded-xl shrink-0">
            <Wallet size={16} />
          </div>
        </div>

        {/* Total Transactions Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-2xl p-3 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total Ledger Entries</p>
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {filteredAndSortedData.length}
            </h3>
          </div>
          <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl shrink-0">
            <BookOpen size={16} />
          </div>
        </div>
      </div>

      {/* Sleek Toolbar & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-2xl p-3 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              Cash Book (Income & Expense)
            </h3>
          </div>
        </div>

        {/* Right Search, Filters & Export Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
          {/* Search Input */}
          <div className="relative w-full md:w-44">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search party, notes..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
          </div>

          {/* Entry Type Filter (All / Income / Expense) */}
          <select
            value={entryTypeFilter}
            onChange={(e) => setEntryTypeFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="">All Ledger Entries</option>
            <option value="INCOME">🟢 Income Only (Inflow)</option>
            <option value="EXPENSE">🔴 Expense Only (Outflow)</option>
          </select>

          {/* Payment Mode Filter */}
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="">All Payment Modes</option>
            <option value="Cash">Cash</option>
            <option value="UPI_BANK">UPI / Bank</option>
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>

          {/* Date Pickers */}
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            title="Start Date"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            title="End Date"
          />

          <button
            onClick={fetchCashBook}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
            title="Refresh Ledger"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>

          {/* Export Actions */}
          <button
            onClick={handleExportExcel}
            className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
            title="Export Excel"
          >
            <FileSpreadsheet size={13} />
            Excel
          </button>

          <button
            onClick={handleExportPDF}
            className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
            title="Export PDF"
          >
            <FileText size={13} />
            PDF
          </button>
        </div>
      </div>

      {/* Cash Book Main Ledger Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/70 dark:bg-slate-950/50 border-b border-slate-200/60 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Entry Type</th>
                <th className="py-3 px-4">Category / Dept</th>
                <th className="py-3 px-4">Party / Source / Notes</th>
                <th className="py-3 px-4">Payment Mode</th>
                <th className="py-3 px-4 text-right">Inflow (₹)</th>
                <th className="py-3 px-4 text-right">Outflow (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-700 dark:text-slate-300 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="animate-spin text-indigo-600 mx-auto mb-2" size={24} />
                    Loading cash book entries...
                  </td>
                </tr>
              ) : filteredAndSortedData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No cash book entries found for selected criteria.
                  </td>
                </tr>
              ) : (
                filteredAndSortedData.map((item) => {
                  const isIncome = item.entryType === 'INCOME';
                  return (
                    <tr key={`${item.entryType}-${item._id}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/30 transition">
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-500 dark:text-slate-400">
                        {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold tracking-wider ${
                          isIncome 
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80' 
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/80'
                        }`}>
                          {isIncome ? '🟢 INCOME' : '🔴 EXPENSE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        {item.categoryName || 'General'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {item.paidTo}
                        {item.description && (
                          <p className="text-[11px] font-normal text-slate-400 line-clamp-1">{item.description}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          String(item.paymentMode || '').toUpperCase() === 'CASH'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                        }`}>
                          {item.paymentMode || 'Cash'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {isIncome ? `+₹${(item.amount || 0).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {!isIncome ? `-₹${(item.amount || 0).toLocaleString('en-IN')}` : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CashBookTab;
