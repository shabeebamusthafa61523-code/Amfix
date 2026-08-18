import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, User, Tag, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

const CONTENT_TYPES = [
  { value: "instagram_post", label: "Instagram Post" },
  { value: "instagram_story", label: "Instagram Story" },
  { value: "facebook_post", label: "Facebook Post" },
  { value: "facebook_story", label: "Facebook Story" },
  { value: "blog_post", label: "Blog Post" },
  { value: "youtube_video", label: "YouTube Video" },
  { value: "newsletter", label: "Newsletter" },
  { value: "twitter_post", label: "Twitter/X Post" },
  { value: "tiktok_video", label: "TikTok Video" },
  { value: "email_campaign", label: "Email Campaign" },
  { value: "web_banner", label: "Web Banner" },
  { value: "other", label: "Other" },
];

/**
 * Form for creating/editing calendar work items
 */
const CalendarWorkForm = ({
  initialData = null,
  employees = [],
  onSubmit,
  loading = false,
  error = null,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    contentType: "",
    assignedTo: "",
    workDate: "",
    workDueDate: "",
    postingDate: "",
    postingTime: "",
    project: "",
    client: "",
    campaign: "",
    isUrgent: false,
    tags: "",
  });

  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || "",
        description: initialData.description || "",
        contentType: initialData.contentType || "",
        assignedTo: initialData.assignedTo?._id || initialData.assignedTo || "",
        workDate: initialData.workDate
          ? new Date(initialData.workDate).toISOString().split("T")[0]
          : "",
        workDueDate: initialData.workDueDate
          ? new Date(initialData.workDueDate).toISOString().split("T")[0]
          : "",
        postingDate: initialData.postingDate
          ? new Date(initialData.postingDate).toISOString().split("T")[0]
          : "",
        postingTime: initialData.postingTime || "",
        project: initialData.project?._id || initialData.project || "",
        client: initialData.client?._id || initialData.client || "",
        campaign: initialData.campaign || "",
        isUrgent: initialData.isUrgent || false,
        tags: Array.isArray(initialData.tags)
          ? initialData.tags.join(", ")
          : "",
      });
    }
  }, [initialData]);

  const validateForm = () => {
    const errors = {};

    if (!formData.title?.trim()) {
      errors.title = "Title is required";
    } else if (formData.title.length < 3) {
      errors.title = "Title must be at least 3 characters";
    } else if (formData.title.length > 500) {
      errors.title = "Title must not exceed 500 characters";
    }

    if (!formData.contentType) {
      errors.contentType = "Content type is required";
    }

    if (!formData.assignedTo) {
      errors.assignedTo = "Assigned to is required";
    }

    if (formData.description && formData.description.length > 3000) {
      errors.description = "Description must not exceed 3000 characters";
    }

    if (formData.postingTime && !/^\d{2}:\d{2}$/.test(formData.postingTime)) {
      errors.postingTime = "Posting time must be in HH:MM format";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Clean up empty string fields so MongoDB ObjectIds and Dates don't throw cast errors
    const cleanedFormData = { ...formData };

    [
      "project",
      "client",
      "workDate",
      "workDueDate",
      "postingDate",
      "postingTime",
      "campaign",
    ].forEach((field) => {
      if (!cleanedFormData[field] || cleanedFormData[field].trim() === "") {
        delete cleanedFormData[field];
      }
    });

    const submitData = {
      ...cleanedFormData,
      tags: formData.tags
        ? formData.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
    };

    onSubmit(submitData);
  };
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-sm text-rose-700 dark:text-rose-200">{error}</p>
        </motion.div>
      )}

      {/* Title */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
          Title <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="e.g., Instagram Carousel Post"
          maxLength={500}
          className={`w-full px-3 py-2.5 rounded-lg border ${
            validationErrors.title
              ? "border-rose-500 bg-rose-50/50 dark:bg-rose-950/20"
              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          } text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition focus:outline-none focus:ring-2 focus:ring-indigo-500`}
        />
        {validationErrors.title && (
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
            {validationErrors.title}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Add any additional details..."
          maxLength={3000}
          rows={3}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="text-xs text-slate-500 mt-1">
          {formData.description.length}/3000 characters
        </p>
      </div>

      {/* Content Type */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
          Content Type <span className="text-rose-500">*</span>
        </label>
        <select
          name="contentType"
          value={formData.contentType}
          onChange={handleChange}
          className={`w-full px-3 py-2.5 rounded-lg border ${
            validationErrors.contentType
              ? "border-rose-500 bg-rose-50/50 dark:bg-rose-950/20"
              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          } text-sm text-slate-900 dark:text-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500`}
        >
          <option value="">Select content type...</option>
          {CONTENT_TYPES.map((ct) => (
            <option key={ct.value} value={ct.value}>
              {ct.label}
            </option>
          ))}
        </select>
        {validationErrors.contentType && (
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
            {validationErrors.contentType}
          </p>
        )}
      </div>

      {/* Assigned To */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
          Assigned To <span className="text-rose-500">*</span>
        </label>
        <select
          name="assignedTo"
          value={formData.assignedTo}
          onChange={handleChange}
          className={`w-full px-3 py-2.5 rounded-lg border ${
            validationErrors.assignedTo
              ? "border-rose-500 bg-rose-50/50 dark:bg-rose-950/20"
              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          } text-sm text-slate-900 dark:text-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500`}
        >
          <option value="">Select an employee...</option>
          {employees.map((emp, index) => {
            const empId = emp._id || emp.id || `emp-${index}`;
            return (
              <option key={empId} value={emp._id || emp.id || ""}>
                {emp.name || emp.email || "Unknown User"} (
                {emp.designation?.name || emp.role || "Staff"})
              </option>
            );
          })}
        </select>
        {validationErrors.assignedTo && (
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
            {validationErrors.assignedTo}
          </p>
        )}
      </div>

      {/* Dates Row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Work Date */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            Work Date
          </label>
          <input
            type="date"
            name="workDate"
            value={formData.workDate}
            onChange={handleChange}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Work Due Date */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            Due Date
          </label>
          <input
            type="date"
            name="workDueDate"
            value={formData.workDueDate}
            onChange={handleChange}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Posting Dates Row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Posting Date */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            Posting Date
          </label>
          <input
            type="date"
            name="postingDate"
            value={formData.postingDate}
            onChange={handleChange}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Posting Time */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            Posting Time (HH:MM)
          </label>
          <input
            type="time"
            name="postingTime"
            value={formData.postingTime}
            onChange={handleChange}
            className={`w-full px-3 py-2.5 rounded-lg border ${
              validationErrors.postingTime
                ? "border-rose-500 bg-rose-50/50 dark:bg-rose-950/20"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            } text-sm text-slate-900 dark:text-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500`}
          />
          {validationErrors.postingTime && (
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
              {validationErrors.postingTime}
            </p>
          )}
        </div>
      </div>

      {/* Campaign & Tags Row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Campaign */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            Campaign
          </label>
          <input
            type="text"
            name="campaign"
            value={formData.campaign}
            onChange={handleChange}
            placeholder="e.g., Summer Sale 2026"
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            Tags (comma separated)
          </label>
          <input
            type="text"
            name="tags"
            value={formData.tags}
            onChange={handleChange}
            placeholder="e.g., featured, urgent"
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Urgent Checkbox */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="isUrgent"
          name="isUrgent"
          checked={formData.isUrgent}
          onChange={handleChange}
          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
        />
        <label
          htmlFor="isUrgent"
          className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
        >
          Mark as Urgent
        </label>
      </div>

      {/* Submit Button */}
      <motion.button
        type="submit"
        disabled={loading}
        whileHover={{ scale: loading ? 1 : 1.02 }}
        whileTap={{ scale: loading ? 1 : 0.98 }}
        className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Saving..." : initialData ? "Update Work" : "Create Work"}
      </motion.button>
    </form>
  );
};

export default CalendarWorkForm;
