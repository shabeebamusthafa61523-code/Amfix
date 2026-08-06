import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tag, PlusCircle, DollarSign, BookOpen, BarChart3, Wallet } from 'lucide-react';

import ExpenseCategoriesTab from '../components/accounts/ExpenseCategoriesTab';
import AddExpenseTab from '../components/accounts/AddExpenseTab';
import SalaryPaymentTab from '../components/accounts/SalaryPaymentTab';
import CashBookTab from '../components/accounts/CashBookTab';
import ExpenseReportsTab from '../components/accounts/ExpenseReportsTab';

const AccountsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab based on current pathname
  const getTabFromPath = (path) => {
    if (path.includes('/accounts/categories')) return 'categories';
    if (path.includes('/accounts/expenses')) return 'expenses';
    if (path.includes('/accounts/salary')) return 'salary';
    if (path.includes('/accounts/cash-book')) return 'cash-book';
    if (path.includes('/accounts/reports')) return 'reports';
    return 'cash-book'; // Default tab
  };

  const [activeTab, setActiveTab] = useState(() => getTabFromPath(location.pathname));

  useEffect(() => {
    setActiveTab(getTabFromPath(location.pathname));
  }, [location.pathname]);

  const handleTabChange = (tabId, path) => {
    setActiveTab(tabId);
    navigate(path);
  };

  return (
    <div className="space-y-6">
      {/* Top Accounts Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Accounts Department
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Centralized financial management, expense tracking, employee salary disbursal & ledger analytics.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 scrollbar-none">
          <button
            onClick={() => handleTabChange('categories', '/accounts/categories')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Tag size={16} />
            <span>Expense Categories</span>
          </button>

          <button
            onClick={() => handleTabChange('expenses', '/accounts/expenses')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <PlusCircle size={16} />
            <span>Add Expense</span>
          </button>

          <button
            onClick={() => handleTabChange('salary', '/accounts/salary')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'salary'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <DollarSign size={16} />
            <span>Salary Payment</span>
          </button>

          <button
            onClick={() => handleTabChange('cash-book', '/accounts/cash-book')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'cash-book'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <BookOpen size={16} />
            <span>Cash Book</span>
          </button>

          <button
            onClick={() => handleTabChange('reports', '/accounts/reports')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <BarChart3 size={16} />
            <span>Expense Report</span>
          </button>
        </div>
      </div>

      {/* Main Tab View */}
      <div className="transition-all duration-300">
        {activeTab === 'categories' && <ExpenseCategoriesTab />}
        {activeTab === 'expenses' && <AddExpenseTab />}
        {activeTab === 'salary' && <SalaryPaymentTab />}
        {activeTab === 'cash-book' && <CashBookTab />}
        {activeTab === 'reports' && <ExpenseReportsTab />}
      </div>
    </div>
  );
};

export default AccountsPage;
