import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import CalendarDay from "./CalendarDay";

/**
 * Calendar toolbar with navigation and month/year display
 */
const CalendarToolbar = ({
  currentDate,
  onPrevMonth,
  onNextMonth,
  onToday,
}) => {
  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {monthYear}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Content Calendar
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onPrevMonth}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-400"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={onToday}
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition"
          aria-label="Go to today"
        >
          Today
        </button>

        <button
          onClick={onNextMonth}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-400"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

/**
 * Main Calendar View Component
 * Displays a month-view calendar with calendar work items
 */
const CalendarView = ({
  calendarItems = [],
  currentDate,
  onPrevMonth,
  onNextMonth,
  onToday,
  onItemClick,
  onAddWork,
  loading = false,
}) => {
  const safeCalendarItems = Array.isArray(calendarItems) ? calendarItems : [];
  // Get days of the current month
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const today = new Date();
  const isCurrentMonth =
    today.getMonth() === currentDate.getMonth() &&
    today.getFullYear() === currentDate.getFullYear();

  // Create array of days to display
  const days = useMemo(() => {
    const dayArray = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      dayArray.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      dayArray.push(i);
    }

    return dayArray;
  }, [daysInMonth, firstDay]);

  // Group calendar items by date
  const itemsByDate = useMemo(() => {
    const grouped = {};

    calendarItems.forEach((item) => {
      // Prefer postingDate for calendar display, fall back to workDate
      const displayDate = item.postingDate || item.workDate;

      if (displayDate) {
        const date = new Date(displayDate);
        const day = date.getDate();
        const month = date.getMonth();
        const year = date.getFullYear();

        if (
          month === currentDate.getMonth() &&
          year === currentDate.getFullYear()
        ) {
          if (!grouped[day]) {
            grouped[day] = [];
          }
          grouped[day].push(item);
        }
      }
    });

    return grouped;
  }, [calendarItems, currentDate]);

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="w-full">
      <CalendarToolbar
        currentDate={currentDate}
        onPrevMonth={onPrevMonth}
        onNextMonth={onNextMonth}
        onToday={onToday}
      />

      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-bold text-slate-600 dark:text-slate-400 py-3"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {loading ? (
          <div className="col-span-7 py-20 text-center">
            <p className="text-sm text-slate-500">Loading calendar...</p>
          </div>
        ) : days.length === 0 ? (
          <div className="col-span-7 py-20 text-center">
            <p className="text-sm text-slate-500">No calendar data available</p>
          </div>
        ) : (
          days.map((day, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.02 }}
            >
              <CalendarDay
                day={day}
                items={day ? itemsByDate[day] || [] : []}
                isToday={isCurrentMonth && day === today.getDate()}
                onItemClick={onItemClick}
                onAddClick={() => onAddWork && onAddWork(day)}
              />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default CalendarView;
