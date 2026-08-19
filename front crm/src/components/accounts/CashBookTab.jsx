import React, { useState, useEffect, useMemo } from 'react';
import { getCashBook, getExpenseCategories } from '../../services/accountsService';
import { BookOpen, ArrowUpRight, RefreshCw, FileSpreadsheet, FileText, Download, Wallet, CreditCard, DollarSign, ArrowUpDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const CashBookTab = () => {
  const [cashBookData, setCashBookData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState({ totalOutflow: 0, totalEntries: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Sorting
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMode, setFilterMode] = useState(''); // 'Cash', 'UPI', 'Bank'
  const [sortBy, setSortBy] = useState('date-desc'); // 'date-desc', 'date-asc', 'amount-desc', 'amount-asc'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchCashBook = async () => {
    setLoading(true);
    setError('');
    try {
      const [cashRes, catRes] = await Promise.all([
        getCashBook({ type: filterType, category: filterCategory, paymentMode: filterMode, startDate, endDate }),
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
  }, [filterType, filterCategory, filterMode, startDate, endDate]);

  // Client-side sorting logic
  const sortedCashBookData = useMemo(() => {
    const data = [...cashBookData];
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
  }, [cashBookData, sortBy]);

  // Payment mode summary breakdown
  const modeBreakdown = useMemo(() => {
    let cash = 0;
    let upi = 0;
    let bank = 0;
    cashBookData.forEach(item => {
      const mode = String(item.paymentMode || '').toUpperCase();
      const amt = item.amount || 0;
      if (mode === 'CASH') cash += amt;
      else if (mode === 'UPI') upi += amt;
      else if (mode === 'BANK') bank += amt;
    });
    return { cash, upi, bank };
  }, [cashBookData]);

  // Export to Excel
  const handleExportExcel = () => {
    if (sortedCashBookData.length === 0) {
      alert('No cash book records to export.');
      return;
    }

    const exportData = sortedCashBookData.map((item, idx) => ({
      'S.No': idx + 1,
      'Date': new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      'Type': item.type || 'Expense',
      'Category': item.type === 'Salary' ? 'Employee Salary' : (item.categoryName || item.category?.name || 'General'),
      'Paid To / Recipient': item.paidTo || 'N/A',
      'Payment Mode': item.paymentMode || 'Cash',
      'Amount (INR)': item.amount || 0,
      'Description': item.description || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cash Book Outflow');

    // Auto-set column widths
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 15 },
      { wch: 12 },
      { wch: 22 },
      { wch: 28 },
      { wch: 15 },
      { wch: 16 },
      { wch: 35 }
    ];

    XLSX.writeFile(workbook, `Cash_Book_Outflow_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (sortedCashBookData.length === 0) {
      alert('No cash book records to export.');
      return;
    }

    const doc = new jsPDF('p', 'pt', 'a4');

    // PDF Header Title & Meta
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text('CASH BOOK OUTFLOW LEDGER REPORT', 40, 40);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 40, 55);
    doc.text(`Total Outflow: RS. ${(summary.totalOutflow || 0).toLocaleString('en-IN')} | Total Transactions: ${sortedCashBookData.length}`, 40, 68);

    const tableRows = sortedCashBookData.map((item, idx) => [
      idx + 1,
      new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      item.type || 'Expense',
      item.type === 'Salary' ? 'Employee Salary' : (item.categoryName || item.category?.name || 'General'),
      item.paidTo || 'N/A',
      item.paymentMode || 'Cash',
      `RS. ${(item.amount || 0).toLocaleString('en-IN')}`
    ]);

    autoTable(doc, {
      startY: 85,
      head: [['#', 'Date', 'Type', 'Category', 'Paid To / Recipient', 'Mode', 'Amount']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [79, 70, 229], // Indigo 600
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
        3: { cellWidth: 90 },
        4: { cellWidth: 140 },
        5: { cellWidth: 55 },
        6: { cellWidth: 85, halign: 'right' }
      }
    });

    doc.save(`Cash_Book_Outflow_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Outflow Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Total Outflow</p>
            <h3 className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
              ₹{(summary.totalOutflow || 0).toLocaleString('en-IN')}
            </h3>
          </div>
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-xl">
            <ArrowUpRight size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Cash Outflow</p>
            <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              ₹{modeBreakdown.cash.toLocaleString('en-IN')}
            </h3>
          </div>
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-xl">
            <Wallet size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">UPI / Bank Outflow</p>
            <h3 className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              ₹{(modeBreakdown.upi + modeBreakdown.bank).toLocaleString('en-IN')}
            </h3>
          </div>
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 rounded-xl">
            <CreditCard size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Total Transactions</p>
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">
              {sortedCashBookData.length}
            </h3>
          </div>
          <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl">
            <BookOpen size={20} />
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
              Real-time audit log of all outgoing payments with mode filtering & export tools.
            </p>
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Export Cash Book to Excel"
            >
              <FileSpreadsheet size={14} />
              <span>Export Excel</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Export Cash Book to PDF"
            >
              <FileText size={14} />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Payment Mode Sorting / Filter (CASH / UPI / BANK) */}
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs font-semibold focus:border-indigo-500 outline-none cursor-pointer"
            >
              <option value="">All Payment Modes</option>
              <option value="Cash">💵 CASH</option>
              <option value="UPI_BANK">📱 / 🏦 UPI / BANK</option>
            </select>

            {/* Type filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs font-semibold outline-none"
            >
              <option value="">All Types</option>
              <option value="Expense">Expense Only</option>
              <option value="Salary">Salary Only</option>
            </select>

            {/* Category filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs font-semibold outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>

            {/* Sort Order */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs font-semibold outline-none"
            >
              <option value="date-desc">📅 Date: Newest First</option>
              <option value="date-asc">📅 Date: Oldest First</option>
              <option value="amount-desc">💰 Amount: High to Low</option>
              <option value="amount-asc">💰 Amount: Low to High</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {/* Date Start */}
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs font-semibold outline-none"
            />

            {/* Date End */}
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs font-semibold outline-none"
            />

            <button
              onClick={fetchCashBook}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
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
              ) : sortedCashBookData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No money outflow entries recorded yet.
                  </td>
                </tr>
              ) : (
                sortedCashBookData.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-3 whitespace-nowrap font-medium text-slate-900 dark:text-slate-100">
                      {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
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
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${
                        String(item.paymentMode || '').toUpperCase() === 'CASH'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80'
                          : String(item.paymentMode || '').toUpperCase() === 'UPI'
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/80'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200'
                      }`}>
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
