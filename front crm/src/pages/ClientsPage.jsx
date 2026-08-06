import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building, Plus, Search, ShieldCheck, DollarSign, Users, 
  RefreshCw, ChevronLeft, ChevronRight, Filter, SlidersHorizontal
} from 'lucide-react';
import { getClients, deleteClient } from '../services/clientService';
import StatsCard from '../components/StatsCard';
import ConfirmModal from '../components/ConfirmModal';
import ClientViewSwitcher from '../components/clients/ClientViewSwitcher';
import ClientGridView from '../components/clients/ClientGridView';
import ClientTableView from '../components/clients/ClientTableView';

const ClientsPage = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});

  // View Mode initialized from localStorage (default: 'grid')
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('clientViewMode') || 'grid';
  });

  // Filter & Search States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Pagination States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // Delete Modal States
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  useEffect(() => {
    fetchClientsList();
  }, [search, statusFilter, typeFilter, priorityFilter, sortBy, sortOrder, page, limit]);

  const handleViewChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('clientViewMode', mode);
  };

  const fetchClientsList = async () => {
    setLoading(true);
    try {
      const res = await getClients({
        search,
        status: statusFilter,
        clientType: typeFilter,
        priority: priorityFilter,
        sortBy,
        sortOrder,
        page,
        limit
      });

      if (res && res.success) {
        setClients(res.data.clients || []);
        setPagination(res.data.pagination || { total: 0, pages: 1 });
        setStats(res.data.stats || {});
      }
    } catch (err) {
      console.error("Failed to fetch clients list:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setPriorityFilter('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  const promptDeleteClient = (id) => {
    setClientToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;
    try {
      const res = await deleteClient(clientToDelete);
      if (res && res.success) {
        setClients(prev => prev.filter(c => (c._id || c.id) !== clientToDelete));
        fetchClientsList();
      }
    } catch (err) {
      console.error("Failed to delete client:", err);
    } finally {
      setDeleteModalOpen(false);
      setClientToDelete(null);
    }
  };

  const handleTableSort = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center shadow-xs">
              <Building className="w-5 h-5" />
            </div>
            Client Directory & Portfolio
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Manage enterprise accounts, active retainers, billing details, and NDA status.
          </p>
        </div>

        {/* Action Controls & View Switcher */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <ClientViewSwitcher
            viewMode={viewMode}
            onViewChange={handleViewChange}
          />

          <Link
            to="/clients/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Client</span>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Accounts"
          value={stats.totalClients || 0}
          icon={Building}
          description="Registered client profiles"
        />
        <StatsCard
          title="Active Clients"
          value={stats.activeClients || 0}
          icon={ShieldCheck}
          description="Currently active retainers"
        />
        <StatsCard
          title="Enterprise Accounts"
          value={stats.enterpriseClients || 0}
          icon={Users}
          description="Enterprise Tier Clients"
        />
        <StatsCard
          title="Monthly Revenue"
          value={`₹${(stats.totalMonthlyRevenue || 0).toLocaleString()}`}
          icon={DollarSign}
          description="Expected monthly retainer"
        />
      </div>

      {/* Filters & Search Toolbar */}
      <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md flex flex-col gap-4 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <div className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search company, client, ID, email, industry..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-none text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer relative ${
                isFilterOpen || (statusFilter || typeFilter || priorityFilter || (sortBy !== 'createdAt'))
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters & Sort</span>
              {[statusFilter, typeFilter, priorityFilter, sortBy !== 'createdAt' ? sortBy : ''].filter(Boolean).length > 0 && (
                <span className="w-4 h-4 rounded-full bg-white text-indigo-600 text-[10px] font-black flex items-center justify-center">
                  {[statusFilter, typeFilter, priorityFilter, sortBy !== 'createdAt' ? sortBy : ''].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Filter & Sort Panel */}
        {isFilterOpen && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full items-end">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="On Hold">On Hold</option>
                <option value="Lead">Lead</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Client Type</label>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="">All Types</option>
                <option value="Enterprise">Enterprise</option>
                <option value="SMB">SMB</option>
                <option value="Startup">Startup</option>
                <option value="Retainer">Retainer</option>
                <option value="One-Time">One-Time</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="">All Priorities</option>
                <option value="VIP">VIP</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="createdAt">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="company">Company Name A-Z</option>
                <option value="revenue">Highest Revenue</option>
                <option value="priority">Priority Tier</option>
              </select>
            </div>

            <div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Clients View Display (Grid or Table) */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400 font-semibold flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          <span>Loading client profiles & metrics...</span>
        </div>
      ) : clients.length === 0 ? (
        <div className="py-20 text-center text-xs text-slate-400 font-semibold flex flex-col items-center gap-3 bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-slate-200/80 dark:border-slate-800/80">
          <Building className="w-12 h-12 text-slate-300 dark:text-slate-700" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">No client accounts found</span>
          <span>Try resetting your search query or filters.</span>
          <button
            onClick={handleResetFilters}
            className="mt-2 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold text-xs hover:bg-indigo-100 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <ClientTableView
          clients={clients}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleTableSort}
          onDelete={promptDeleteClient}
        />
      ) : (
        <ClientGridView
          clients={clients}
          onDelete={promptDeleteClient}
        />
      )}

      {/* Pagination Footer Controls */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200/80 dark:border-slate-800/80 text-xs font-bold text-slate-500">
          <div>
            Showing page {pagination.page} of {pagination.pages} ({pagination.total} total accounts)
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              {page}
            </span>

            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(prev => Math.min(prev + 1, pagination.pages))}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setClientToDelete(null); }}
        onConfirm={confirmDeleteClient}
        title="Delete Client Account"
        message="Are you sure you want to delete this client account? All associated records and activity history will be removed."
        confirmText="Delete Account"
        type="danger"
      />
    </div>
  );
};

export default ClientsPage;
