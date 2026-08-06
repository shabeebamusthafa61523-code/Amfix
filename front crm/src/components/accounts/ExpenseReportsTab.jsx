import React, { useState, useEffect } from 'react';
import { getDailyReport, getMonthlyReport, getCategoryWiseReport, getSalaryReport } from '../../services/accountsService';
import { BarChart3, Calendar, PieChart, DollarSign, ArrowDownToLine, RefreshCw, FileSpreadsheet } from 'lucide-react';

const ExpenseReportsTab = () => {
  const [activeReportSubTab, setActiveReportSubTab] = useState('daily');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState('');

  // Daily Filter
  const [dailyDate, setDailyDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Monthly Filter
  const [monthlyYear, setMonthlyYear] = useState(() => new Date().getFullYear().toString());
  const [monthlyMonth, setMonthlyMonth] = useState(() => (new Date().getMonth() + 1).toString());

  // Category Filter
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Salary Filter
  const [salaryMonth, setSalaryMonth] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeReportSubTab === 'daily') {
        const res = await getDailyReport({ date: dailyDate });
        if (res.success) setReportData(res);
      } else if (activeReportSubTab === 'monthly') {
        const res = await getMonthlyReport({ year: monthlyYear, month: monthlyMonth });
        if (res.success) setReportData(res);
      } else if (activeReportSubTab === 'category') {
        const res = await getCategoryWiseReport({ startDate, endDate });
        if (res.success) setReportData(res);
      } else if (activeReportSubTab === 'salary') {
        const res = await getSalaryReport({ month: salaryMonth });
        if (res.success) setReportData(res);
      }
    } catch (err) {
      console.error('Fetch report error:', err);
      setError('Error loading report analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeReportSubTab, dailyDate, monthlyYear, monthlyMonth, startDate, endDate, salaryMonth]);

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Accounts & Financial Reports
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Consolidated analytical reporting for expenses and salary disbursements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintReport}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition cursor-pointer"
          >
            <ArrowDownToLine size={14} />
            <span>Print / Export PDF</span>
          </button>
          <button
            onClick={fetchReport}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Refresh Report"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* 4 Required Report Selector Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
        <button
          onClick={() => setActiveReportSubTab('daily')}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
            activeReportSubTab === 'daily'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Calendar size={15} />
          <span>Daily Expense</span>
        </button>

        <button
          onClick={() => setActiveReportSubTab('monthly')}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
            activeReportSubTab === 'monthly'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <BarChart3 size={15} />
          <span>Monthly Expense</span>
        </button>

        <button
          onClick={() => setActiveReportSubTab('category')}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
            activeReportSubTab === 'category'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <PieChart size={15} />
          <span>Category-wise</span>
        </button>

        <button
          onClick={() => setActiveReportSubTab('salary')}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
            activeReportSubTab === 'salary'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <DollarSign size={15} />
          <span>Salary Report</span>
        </button>
      </div>

      {/* ── REPORT CONTENT PANEL ── */}

      {/* 1. DAILY EXPENSE REPORT */}
      {activeReportSubTab === 'daily' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Daily Expense Breakdown</h3>
              <p className="text-xs text-slate-400">Filter expenses recorded on a specific date.</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Select Date:</label>
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs font-medium"
              />
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-xs text-slate-400 font-semibold">Total Day Expense</p>
              <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                ₹{(reportData?.summary?.totalAmount || 0).toLocaleString('en-IN')}
              </h4>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-xs text-slate-400 font-semibold">Salary Payments</p>
              <h4 className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
                ₹{(reportData?.summary?.salaryTotal || 0).toLocaleString('en-IN')}
              </h4>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-xs text-slate-400 font-semibold">General Expenses</p>
              <h4 className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                ₹{(reportData?.summary?.generalExpenseTotal || 0).toLocaleString('en-IN')}
              </h4>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Daily Transaction Details</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-y border-slate-200/60 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Paid To</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-400">Loading daily report...</td></tr>
                  ) : !reportData?.data || reportData.data.length === 0 ? (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-400">No expenses recorded for this date.</td></tr>
                  ) : (
                    reportData.data.map((e) => (
                      <tr key={e._id}>
                        <td className="py-3 px-3 font-semibold">{e.categoryName}</td>
                        <td className="py-3 px-3">{e.paidTo}</td>
                        <td className="py-3 px-3">{e.paymentMode}</td>
                        <td className="py-3 px-3 text-slate-500">{e.description || '—'}</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">₹{e.amount?.toLocaleString('en-IN')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. MONTHLY EXPENSE REPORT */}
      {activeReportSubTab === 'monthly' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Monthly Expense Summary</h3>
              <p className="text-xs text-slate-400">Monthly financial overview of expenses & salaries.</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={monthlyMonth}
                onChange={(e) => setMonthlyMonth(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
              >
                {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, idx) => (
                  <option key={idx} value={idx + 1}>{m}</option>
                ))}
              </select>
              <select
                value={monthlyYear}
                onChange={(e) => setMonthlyYear(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-xs text-slate-400 font-semibold">Monthly Total Outflow</p>
              <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                ₹{(reportData?.summary?.totalAmount || 0).toLocaleString('en-IN')}
              </h4>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-xs text-slate-400 font-semibold">Salary Payments</p>
              <h4 className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
                ₹{(reportData?.summary?.salaryTotal || 0).toLocaleString('en-IN')}
              </h4>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-xs text-slate-400 font-semibold">General Expenses</p>
              <h4 className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                ₹{(reportData?.summary?.generalExpenseTotal || 0).toLocaleString('en-IN')}
              </h4>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Monthly Expense Register</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-y border-slate-200/60 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Paid To</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-400">Loading monthly report...</td></tr>
                  ) : !reportData?.data || reportData.data.length === 0 ? (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-400">No expenses recorded for this month.</td></tr>
                  ) : (
                    reportData.data.map((e) => (
                      <tr key={e._id}>
                        <td className="py-3 px-3 font-medium">{new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                        <td className="py-3 px-3 font-semibold">{e.categoryName}</td>
                        <td className="py-3 px-3">{e.paidTo}</td>
                        <td className="py-3 px-3">{e.paymentMode}</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">₹{e.amount?.toLocaleString('en-IN')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. CATEGORY-WISE EXPENSE REPORT */}
      {activeReportSubTab === 'category' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Category-Wise Expense Analytics</h3>
              <p className="text-xs text-slate-400">Percentage distribution & breakdown across expense categories.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                placeholder="Start Date"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                placeholder="End Date"
              />
            </div>
          </div>

          {/* Grand Total Banner */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-semibold">Grand Total Expense Across Categories</p>
              <h4 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                ₹{(reportData?.summary?.grandTotal || 0).toLocaleString('en-IN')}
              </h4>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
              {reportData?.summary?.categoryCount || 0} Categories Active
            </span>
          </div>

          {/* Category Progress Bars */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Distribution Breakdown</h4>
            {loading ? (
              <p className="text-center py-6 text-slate-400 text-xs">Loading category report...</p>
            ) : !reportData?.data || reportData.data.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-xs">No category data found.</p>
            ) : (
              reportData.data.map((cat, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-800 dark:text-slate-200 font-bold">{cat.category}</span>
                    <span className="text-slate-600 dark:text-slate-400 font-semibold">
                      ₹{(cat.totalAmount || 0).toLocaleString('en-IN')} ({cat.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. SALARY REPORT */}
      {activeReportSubTab === 'salary' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Employee Salary Disbursement Report</h3>
              <p className="text-xs text-slate-400">Total salaries paid across employees & payroll records.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Filter Month (e.g. August 2026)"
                value={salaryMonth}
                onChange={(e) => setSalaryMonth(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
              />
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-xs text-slate-400 font-semibold">Total Disbursed Salary</p>
              <h4 className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                ₹{(reportData?.summary?.totalPaid || 0).toLocaleString('en-IN')}
              </h4>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-xs text-slate-400 font-semibold">Total Salary Records Processed</p>
              <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
                {reportData?.summary?.employeeCount || 0}
              </h4>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Salary Disbursal Audit Table</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-y border-slate-200/60 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Employee</th>
                    <th className="py-2.5 px-3">Month</th>
                    <th className="py-2.5 px-3">Basic Salary</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3 text-right">Paid Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr><td colSpan={6} className="py-6 text-center text-slate-400">Loading salary report...</td></tr>
                  ) : !reportData?.data || reportData.data.length === 0 ? (
                    <tr><td colSpan={6} className="py-6 text-center text-slate-400">No salary payment records found.</td></tr>
                  ) : (
                    reportData.data.map((p) => (
                      <tr key={p._id}>
                        <td className="py-3 px-3 font-medium">{new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">{p.employeeName || p.employee?.name}</td>
                        <td className="py-3 px-3">{p.month}</td>
                        <td className="py-3 px-3 text-slate-500">₹{(p.basicSalary || 0).toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3">{p.paymentMode}</td>
                        <td className="py-3 px-3 text-right font-bold text-purple-600 dark:text-purple-400">₹{p.paidAmount?.toLocaleString('en-IN')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseReportsTab;
