const getAuthHeader = () => {
  const rawToken = localStorage.getItem('token');
  const token = rawToken ? rawToken.replace(/^"(.*)"$/, '$1').replace(/"/g, '').replace(/^Bearer\s+/i, '').trim() : '';
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const extractTasks = data => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.tasks)) return data.tasks;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.tasks)) return data.data.tasks;
  return [];
};

const getTasksUrl = () => {
  const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
  return base.endsWith('/v1') ? `${base}/tasks/all` : `${base}/v1/tasks/all`;
};

export const fetchCompletedTasks = async (userId, dateStr) => {
  if (!userId || !dateStr) return [];
  try {
    const res = await fetch(getTasksUrl(), {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) return [];
    
    const data = await res.json();
    const tasks = extractTasks(data);
    
    // Filter for tasks assigned to the user matching the selected report date.
    const filteredTasks = tasks.filter(t => {
      // Check user assignment
      const assignedUser = t.assigned_to?._id || t.assigned_to?.id || t.assigned_to || t.assignedTo?._id || t.assignedTo?.id || t.assignedTo;
      if (String(assignedUser) !== String(userId)) return false;
      
      const statusLower = String(t.status || '').toLowerCase();
      const isDone = ['done', 'completed'].includes(statusLower);

      const getDateStrings = (d) => {
        if (!d) return [];
        try {
          const dateObj = new Date(d);
          if (isNaN(dateObj.getTime())) return [];

          const localY = dateObj.getFullYear();
          const localM = String(dateObj.getMonth() + 1).padStart(2, '0');
          const localD = String(dateObj.getDate()).padStart(2, '0');
          const localDateStr = `${localY}-${localM}-${localD}`;

          const utcY = dateObj.getUTCFullYear();
          const utcM = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
          const utcD = String(dateObj.getUTCDate()).padStart(2, '0');
          const utcDateStr = `${utcY}-${utcM}-${utcD}`;

          return [localDateStr, utcDateStr];
        } catch (e) {
          return [];
        }
      };

      const matchesDate = (d) => getDateStrings(d).includes(dateStr);

      // If task was already completed on a date prior to dateStr (e.g. updated to complete yesterday), exclude it from today's report
      if (isDone) {
        const completionTime = t.updatedAt || t.completedAt;
        const completionDateStrs = getDateStrings(completionTime);
        const isCompletedOnPriorDate = completionDateStrs.length > 0 && completionDateStrs.every(cd => cd < dateStr);
        if (isCompletedOnPriorDate) {
          return false;
        }
        return matchesDate(t.updatedAt) || matchesDate(t.completedAt) || matchesDate(t.date) || matchesDate(t.dueDate);
      }
      
      const isPendingOrInProgress = ['pending', 'current'].includes(statusLower);
      const dateMatches = matchesDate(t.date) || matchesDate(t.createdAt) || matchesDate(t.dueDate);
      
      return dateMatches || isPendingOrInProgress;
    });

    // Format task title and attributes timezone-safely for reports
    return filteredTasks.map(t => {
      // Map status values to human-friendly text
      const statusMap = {
        pending: 'Pending',
        current: 'In Progress',
        preview: 'Preview',
        done: 'Done'
      };
      const statusText = statusMap[String(t.status).toLowerCase()] || (t.status ? String(t.status) : 'N/A');

      const formatTime = (dateObjOrStr) => {
        if (!dateObjOrStr) return '';
        try {
          const d = new Date(dateObjOrStr);
          if (isNaN(d.getTime())) return '';
          
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          const datePart = `${day}-${month}-${year}`;

          const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return `${datePart} ${timePart}`;
        } catch (e) {
          return '';
        }
      };

      const startTime = formatTime(t.createdAt || t.startTime || t.startDate);
      const endTime = formatTime(t.updatedAt || t.endTime || t.endDate) || (String(t.status).toLowerCase() === 'done' ? formatTime(t.updatedAt) : formatTime(t.createdAt));

      // ISO/datetime-local formatted strings (YYYY-MM-DDTHH:mm) for datetime-local inputs
      const formatDateTimeLocal = (dateObjOrStr) => {
        if (!dateObjOrStr) return '';
        try {
          const d = new Date(dateObjOrStr);
          if (isNaN(d.getTime())) return '';
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        } catch (e) {
          return '';
        }
      };

      const startDateTimeLocal = formatDateTimeLocal(t.createdAt || t.startTime || t.startDate);
      const endDateTimeLocal = formatDateTimeLocal(t.updatedAt || t.endTime || t.endDate) || startDateTimeLocal;

      // Format due date in UTC (DD-MM-YYYY) to prevent timezone shifts
      let dueDateText = '';
      let formattedDueDate = '';
      if (t.dueDate) {
        try {
          const d = new Date(t.dueDate);
          const day = String(d.getUTCDate()).padStart(2, '0');
          const month = String(d.getUTCMonth() + 1).padStart(2, '0');
          const year = d.getUTCFullYear();
          dueDateText = ` [Due: ${day}-${month}-${year}]`;
          formattedDueDate = `${year}-${month}-${day}`; // YYYY-MM-DD for date inputs
        } catch (e) {}
      }

      return {
        ...t,
        status: statusText,
        startTime,
        endTime,
        startDate: startTime,
        endDate: endTime,
        startDateTimeLocal,
        endDateTimeLocal,
        dueDate: formattedDueDate,
        title: t.title ? `${t.title} [${statusText.toUpperCase()}]` : 'N/A'
      };
    });
  } catch (error) {
    console.error("Error fetching tasks for report:", error);
    return [];
  }
};

const extractUserId = (userField) => {
  if (!userField) return '';
  if (typeof userField === 'object') {
    return String(userField._id || userField.id || '').trim();
  }
  return String(userField).trim();
};

export const fetchDelegatedTasks = async (userId, dateStr) => {
  if (!userId || !dateStr) return [];
  try {
    const res = await fetch(getTasksUrl(), {
      headers: getAuthHeader()
    });
    if (!res.ok) return [];
    
    const data = await res.json();
    const tasks = extractTasks(data);
    
    const matchesDate = (d) => {
      if (!d) return false;
      try {
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return false;
        const localY = dateObj.getFullYear();
        const localM = String(dateObj.getMonth() + 1).padStart(2, '0');
        const localD = String(dateObj.getDate()).padStart(2, '0');
        const localDateStr = `${localY}-${localM}-${localD}`;

        const utcY = dateObj.getUTCFullYear();
        const utcM = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
        const utcD = String(dateObj.getUTCDate()).padStart(2, '0');
        const utcDateStr = `${utcY}-${utcM}-${utcD}`;

        return localDateStr === dateStr || utcDateStr === dateStr;
      } catch (e) {
        return false;
      }
    };

    const delegatedTasks = tasks.filter(t => {
      const createdUser = extractUserId(t.created_by) || extractUserId(t.user_id);
      const assignedUser = extractUserId(t.assigned_to) || extractUserId(t.assignedTo);

      if (createdUser !== String(userId)) return false;
      if (assignedUser && assignedUser === String(userId)) return false; 
      
      const statusLower = String(t.status || '').toLowerCase();
      const isDone = ['done', 'completed'].includes(statusLower);

      if (isDone) {
        const completionTime = t.updatedAt || t.completedAt;
        const completionDateStrs = matchesDate(completionTime);
        // Extract date string from completionTime if needed
        try {
          const dObj = new Date(completionTime);
          if (!isNaN(dObj.getTime())) {
            const locY = dObj.getFullYear();
            const locM = String(dObj.getMonth() + 1).padStart(2, '0');
            const locD = String(dObj.getDate()).padStart(2, '0');
            const locStr = `${locY}-${locM}-${locD}`;
            if (locStr < dateStr) return false;
          }
        } catch (e) {}
      }

      const dateMatches = matchesDate(t.date) || matchesDate(t.createdAt) || matchesDate(t.updatedAt) || matchesDate(t.dueDate);
      const isPendingOrInProgress = ['pending', 'current'].includes(statusLower);

      return dateMatches || isPendingOrInProgress;
    });

    return delegatedTasks.map(t => {
      const statusMap = {
        pending: 'Pending',
        current: 'In Progress',
        preview: 'Preview',
        done: 'Done'
      };
      const statusText = statusMap[String(t.status).toLowerCase()] || (t.status ? String(t.status) : 'N/A');
      
      const assignedName = t.assigned_to?.name || t.assigned_to?.username || t.assigned_to?.employeeName || t.assignedTo?.name || t.assignedTo?.username || 'N/A';

      let formattedDueDate = '';
      if (t.dueDate) {
        try {
          const d = new Date(t.dueDate);
          const day = String(d.getUTCDate()).padStart(2, '0');
          const month = String(d.getUTCMonth() + 1).padStart(2, '0');
          const year = d.getUTCFullYear();
          formattedDueDate = `${year}-${month}-${day}`;
        } catch (e) {}
      }

      return {
        project: assignedName,
        kpi: t.title || 'N/A',
        target: formattedDueDate,
        achieved: statusText
      };
    });
  } catch (error) {
    console.error('Error fetching delegated tasks for report:', error);
    return [];
  }
};
