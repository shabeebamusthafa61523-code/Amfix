import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tag, PlusCircle, DollarSign, BookOpen, BarChart3, Wallet, TrendingUp, FileText } from 'lucide-react';

import ExpenseCategoriesTab from '../components/accounts/ExpenseCategoriesTab';
import AddExpenseTab from '../components/accounts/AddExpenseTab';
import SalaryPaymentTab from '../components/accounts/SalaryPaymentTab';
import CashBookTab from '../components/accounts/CashBookTab';
import ExpenseReportsTab from '../components/accounts/ExpenseReportsTab';
import IncomeTab from '../components/accounts/IncomeTab';
import CreateInvoiceTab from '../components/accounts/CreateInvoiceTab';

const AccountsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab based on current pathname
  const getTabFromPath = (path) => {
    if (path.includes('/accounts/create-invoice')) return 'create-invoice';
    if (path.includes('/accounts/income') || path === '/income') return 'income';
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
    <div className="space-y-4">
      {/* Sleek Minimal Header Navbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-2xl p-2.5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 pl-1">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
          <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-tight shrink-0">
            Accounts
          </h1>
        </div>

        {/* Compact Navigation Tabs Bar */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto scrollbar-none">
          <button
            onClick={() => handleTabChange('income', '/accounts/income')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'income'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <TrendingUp size={14} />
            <span>Income</span>
          </button>

          <button
            onClick={() => handleTabChange('categories', '/accounts/categories')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Tag size={14} />
            <span>Expense Categories</span>
          </button>

          <button
            onClick={() => handleTabChange('expenses', '/accounts/expenses')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <PlusCircle size={14} />
            <span>Add Expense</span>
          </button>

          <button
            onClick={() => handleTabChange('salary', '/accounts/salary')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'salary'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <DollarSign size={14} />
            <span>Salary Payment</span>
          </button>

          <button
            onClick={() => handleTabChange('cash-book', '/accounts/cash-book')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'cash-book'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <BookOpen size={14} />
            <span>Cash Book</span>
          </button>

          <button
            onClick={() => handleTabChange('reports', '/accounts/reports')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <BarChart3 size={14} />
            <span>Expense Report</span>
          </button>
        </div>
      </div>

      {/* Main Tab View */}
      <div className="transition-all duration-300">
        {activeTab === 'create-invoice' && <CreateInvoiceTab />}
        {activeTab === 'income' && <IncomeTab />}
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
