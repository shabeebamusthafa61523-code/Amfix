import React, { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import CalendarDay from "./CalendarDay";
import CalendarDayDrawer from "./CalendarDayDrawer";

const getItemDateValue = (item) => item?.date || item?.postingDate || item?.workDate;

const isWorkCompleted = (item) => {
  const status = String(item?.status || item?.workStatus || "").trim();
  return status.toLowerCase() === "completed";
};

/**
 * Calendar toolbar with navigation and month/year display
 */
const CalendarToolbar = ({
  currentDate,
  onPrevMonth,
  onNextMonth,
  onToday,
}) => {
  const monthYear = currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div>
        <button
          type="button"
          onClick={onToday}
          className="text-left group"
          aria-label={`Jump to today. Currently viewing ${monthYear}`}
          title="Jump to today"
        >
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-500 transition">
            {monthYear}
          </h2>
        </button>
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
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition"
          aria-label="Go to today"
        >
          {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
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
  workItems,
  currentDate,
  onPrevMonth,
  onNextMonth,
  onToday,
  onItemClick,
  onAddWork,
  onStatusChange,
  loading = false,
}) => {
  const [selectedDay, setSelectedDay] = useState(null);
  const safeCalendarItems = Array.isArray(workItems)
    ? workItems
    : Array.isArray(calendarItems)
      ? calendarItems
      : [];

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

  const days = useMemo(() => {
    const dayArray = [];

    for (let i = 0; i < firstDay; i++) {
      dayArray.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      dayArray.push(i);
    }

    return dayArray;
  }, [daysInMonth, firstDay]);

  const itemsByDate = useMemo(() => {
    const grouped = {};

    safeCalendarItems.forEach((item) => {
      const displayDate = getItemDateValue(item);

      if (displayDate) {
        const date = new Date(displayDate);
        if (Number.isNaN(date.getTime())) return;

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
  }, [safeCalendarItems, currentDate]);

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  useEffect(() => {
    setSelectedDay(null);
  }, [currentDate]);

  const selectedDayItems = selectedDay ? itemsByDate[selectedDay] || [] : [];
  const selectedDayDate = selectedDay
    ? new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay)
    : null;

  return (
    <div className="w-full">
      <CalendarToolbar
        currentDate={currentDate}
        onPrevMonth={onPrevMonth}
        onNextMonth={onNextMonth}
        onToday={onToday}
      />

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
          days.map((day, idx) => {
            const dayItems = day ? itemsByDate[day] || [] : [];
            const dayDate = day
              ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
              : null;
            const dayTasks = dayDate
              ? safeCalendarItems.filter((item) => {
                  const rawDate = getItemDateValue(item);
                  if (!rawDate) return false;
                  const parsed = new Date(rawDate);
                  if (Number.isNaN(parsed.getTime())) return false;
                  return parsed.toDateString() === dayDate.toDateString();
                })
              : [];
            const isDayCompleted =
              dayTasks.length > 0 && dayTasks.every((item) => isWorkCompleted(item));

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.02 }}
              >
                <CalendarDay
                  day={day}
                  dayDate={dayDate}
                  items={dayItems}
                  isToday={isCurrentMonth && day === today.getDate()}
                  isDayCompleted={isDayCompleted}
                  onDayClick={() => setSelectedDay(day)}
                  onAddClick={() => onAddWork && onAddWork(day)}
                />
              </motion.div>
            );
          })
        )}
      </div>

      <CalendarDayDrawer
        isOpen={selectedDay !== null}
        date={selectedDayDate}
        items={selectedDayItems}
        onClose={() => setSelectedDay(null)}
        onItemClick={onItemClick}
        onStatusChange={onStatusChange}
        onAddWork={() => {
          if (selectedDay && onAddWork) onAddWork(selectedDay);
        }}
      />
    </div>
  );
};

export default CalendarView;
