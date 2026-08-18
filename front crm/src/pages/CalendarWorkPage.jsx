import React, { useState, useEffect, useCallback } from "react";
import { Plus, Search, Filter, AlertCircle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "../components/ToastProvider";
import { useUser } from "../contexts/UserContext";
import CalendarView from "../modules/calendar/CalendarView";
import CalendarWorkModal from "../modules/calendar/CalendarWorkModal";
import CalendarWorkDetails from "../modules/calendar/CalendarWorkDetails";
import ConfirmModal from "../components/ConfirmModal";
import {
  getCalendarWorks,
  getMyCalendarWork,
  createCalendarWork,
  updateCalendarWork,
  updateWorkStatus,
  updatePostingStatus,
  deleteCalendarWork,
  getCalendarWorkById,
} from "../services/calendarService";

/**
 * Main Calendar Work Page
 * Displays calendar, manages work items
 */
const CalendarWorkPage = () => {
  const { showToast } = useToast();
  const { user } = useUser();

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarItems, setCalendarItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Employee list
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedWork, setSelectedWork] = useState(null);
  const [editingWork, setEditingWork] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [workToDelete, setWorkToDelete] = useState(null);

  // Filters
  const [workStatusFilter, setWorkStatusFilter] = useState("");
  const [postingStatusFilter, setPostingStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  // Form state
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Load employees
  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const response = await fetch(
        `${(import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "")}/v1/users?limit=500`,
        {
          headers: {
            Authorization: `Bearer ${(localStorage.getItem("token") || "")
              .replace(/^"(.*)"$/, "$1")
              .replace(/"/g, "")
              .replace(/^Bearer\s+/i, "")
              .trim()}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setEmployees(
          Array.isArray(data.data) ? data.data : data.data?.users || [],
        );
      }
    } catch (err) {
      console.error("Failed to load employees:", err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Load calendar data
  const loadCalendarData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get first and last day of month
      const startDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1,
      );
      const endDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0,
      );

      const filters = {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        limit: 100,
        skip: 0,
      };

      if (workStatusFilter) filters.workStatus = workStatusFilter;
      if (postingStatusFilter) filters.postingStatus = postingStatusFilter;

      const response = await getCalendarWorks(filters);

      if (response.success) {
        const items = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.data)
            ? response.data.data
            : [];

        setCalendarItems(items);
      } else {
        setError(response.message || "Failed to load calendar data");
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to load calendar data";
      setError(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  }, [currentDate, workStatusFilter, postingStatusFilter, showToast]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleAddWork = (day) => {
    // Pre-fill with selected date
    const workDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day,
    );
    setEditingWork(null);
    setCreateModalOpen(true);
  };

  const handleCreateWork = async (formData) => {
    setFormLoading(true);
    setFormError(null);

    try {
      const response = await createCalendarWork(formData);

      if (response.success) {
        showToast("Calendar work created successfully", "success");
        setCreateModalOpen(false);
        setEditingWork(null);
        loadCalendarData();
      } else {
        setFormError(response.message || "Failed to create calendar work");
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to create calendar work";
      setFormError(errorMsg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditWork = async (work) => {
    try {
      const response = await getCalendarWorkById(work._id);
      if (response.success) {
        setEditingWork(response.data);
        setCreateModalOpen(true);
        setDetailsOpen(false);
      }
    } catch (err) {
      showToast("Failed to load work details", "error");
    }
  };

  const handleUpdateWork = async (formData) => {
    if (!editingWork) return;

    setFormLoading(true);
    setFormError(null);

    try {
      const response = await updateCalendarWork(editingWork._id, formData);

      if (response.success) {
        showToast("Calendar work updated successfully", "success");
        setCreateModalOpen(false);
        setEditingWork(null);
        loadCalendarData();
      } else {
        setFormError(response.message || "Failed to update calendar work");
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to update calendar work";
      setFormError(errorMsg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleFormSubmit = (formData) => {
    if (editingWork) {
      handleUpdateWork(formData);
    } else {
      handleCreateWork(formData);
    }
  };

  const handleItemClick = async (work) => {
    try {
      const response = await getCalendarWorkById(work._id);
      if (response.success) {
        setSelectedWork(response.data);
        setDetailsOpen(true);
      }
    } catch (err) {
      showToast("Failed to load work details", "error");
    }
  };

  const handleDeleteWork = (id) => {
    setWorkToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteWork = async () => {
    if (!workToDelete) return;

    try {
      const response = await deleteCalendarWork(workToDelete);

      if (response.success) {
        showToast("Calendar work deleted successfully", "success");
        setDeleteConfirmOpen(false);
        setDetailsOpen(false);
        setSelectedWork(null);
        setWorkToDelete(null);
        loadCalendarData();
      } else {
        showToast(
          response.message || "Failed to delete calendar work",
          "error",
        );
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to delete calendar work";
      showToast(errorMsg, "error");
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      const response = await updateWorkStatus(id, { status });

      if (response.success) {
        showToast("Work status updated", "success");
        setDetailsOpen(false);
        loadCalendarData();
      } else {
        showToast(response.message || "Failed to update status", "error");
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || err.message || "Failed to update status";
      showToast(errorMsg, "error");
    }
  };

  const handlePostingStatusUpdate = async (id, data) => {
    try {
      const response = await updatePostingStatus(id, data);

      if (response.success) {
        showToast("Posting status updated", "success");
        setDetailsOpen(false);
        loadCalendarData();
      } else {
        showToast(
          response.message || "Failed to update posting status",
          "error",
        );
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to update posting status";
      showToast(errorMsg, "error");
    }
  };

  const handleRefresh = () => {
    loadCalendarData();
    showToast("Calendar refreshed", "success");
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center shadow-xs">
              📅
            </div>
            Content Calendar
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Plan, schedule, and track all your content across the month
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm transition disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Refresh
          </button>
          <button
            onClick={() => {
              setEditingWork(null);
              setCreateModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-sm transition shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Add Work
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={workStatusFilter}
          onChange={(e) => setWorkStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Work Status</option>
          <option value="draft">Draft</option>
          <option value="in_progress">In Progress</option>
          <option value="ready_for_review">Ready for Review</option>
          <option value="approved">Approved</option>
          <option value="revision_requested">Revision Requested</option>
          <option value="completed">Completed</option>
        </select>

        <select
          value={postingStatusFilter}
          onChange={(e) => setPostingStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Posting Status</option>
          <option value="not_scheduled">Not Scheduled</option>
          <option value="scheduled">Scheduled</option>
          <option value="ready_to_post">Ready to Post</option>
          <option value="posted">Posted</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-700 dark:text-rose-200">
              Error Loading Calendar
            </p>
            <p className="text-xs text-rose-600 dark:text-rose-300 mt-0.5">
              {error}
            </p>
          </div>
        </motion.div>
      )}

      {/* Calendar View */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-lg"
      >
        <CalendarView
          calendarItems={calendarItems}
          currentDate={currentDate}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onToday={handleToday}
          onItemClick={handleItemClick}
          onAddWork={handleAddWork}
          loading={loading}
        />
      </motion.div>

      {/* Modals */}
      <CalendarWorkModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setEditingWork(null);
          setFormError(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={editingWork}
        employees={employees}
        loading={formLoading}
        error={formError}
      />

      <CalendarWorkDetails
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        work={selectedWork}
        onEdit={handleEditWork}
        onDelete={handleDeleteWork}
        onStatusUpdate={handleStatusUpdate}
        onPostingStatusUpdate={handlePostingStatusUpdate}
      />

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDeleteWork}
        title="Delete Calendar Work"
        message="Are you sure you want to delete this calendar work item? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
};

export default CalendarWorkPage;
