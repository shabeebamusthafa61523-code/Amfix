export const fetchCompletedTasks = async (userId, dateStr) => {
  if (!userId || !dateStr) return [];
  const API_BASE = import.meta.env.VITE_API_URL;
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/tasks/all`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) return [];
    
    const data = await res.json();
    const tasks = Array.isArray(data) ? data : (data.tasks || data.data || []);
    
    // Filter for tasks assigned to the user matching the selected report date.
    const filteredTasks = tasks.filter(t => {
      // Check user assignment
      const assignedUser = t.assigned_to?._id || t.assigned_to?.id || t.assigned_to || t.assignedTo?._id || t.assignedTo?.id || t.assignedTo;
      if (String(assignedUser) !== String(userId)) return false;
      
      // Check dates timezone-safely by comparing both Local and UTC formatted dates
      const matchesDate = (d) => {
        if (!d) return false;
        try {
          const dateObj = new Date(d);
          if (isNaN(dateObj.getTime())) return false;

          // Local Date parts
          const localY = dateObj.getFullYear();
          const localM = String(dateObj.getMonth() + 1).padStart(2, '0');
          const localD = String(dateObj.getDate()).padStart(2, '0');
          const localDateStr = `${localY}-${localM}-${localD}`;

          // UTC Date parts
          const utcY = dateObj.getUTCFullYear();
          const utcM = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
          const utcD = String(dateObj.getUTCDate()).padStart(2, '0');
          const utcDateStr = `${utcY}-${utcM}-${utcD}`;

          return localDateStr === dateStr || utcDateStr === dateStr;
        } catch (e) {
          return false;
        }
      };

      const dateMatches = matchesDate(t.date) || matchesDate(t.updatedAt) || matchesDate(t.createdAt) || matchesDate(t.dueDate);
      
      const isPendingOrInProgress = ['pending', 'current'].includes(String(t.status).toLowerCase());
      
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
      const statusText = statusMap[String(t.status).toLowerCase()] || 'Pending';

      // Format start and end times dynamically from task timestamps (including both Date and Time)
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

      const startTime = formatTime(t.createdAt);
      const endTime = String(t.status).toLowerCase() === 'done' ? formatTime(t.updatedAt) : '';

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
        dueDate: formattedDueDate,
        title: `${t.title} [${statusText.toUpperCase()}]`
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
  const API_BASE = import.meta.env.VITE_API_URL;
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/tasks/all`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return [];
    
    const data = await res.json();
    const tasks = Array.isArray(data) ? data : (data.tasks || data.data || []);
    
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
      
      const dateMatches = matchesDate(t.date) || matchesDate(t.createdAt) || matchesDate(t.updatedAt) || matchesDate(t.dueDate);
      const isPendingOrInProgress = ['pending', 'current'].includes(String(t.status).toLowerCase());

      return dateMatches || isPendingOrInProgress;
    });

    return delegatedTasks.map(t => {
      const statusMap = {
        pending: 'Pending',
        current: 'In Progress',
        preview: 'Preview',
        done: 'Done'
      };
      const statusText = statusMap[String(t.status).toLowerCase()] || 'Pending';
      
      const assignedName = t.assigned_to?.name || t.assigned_to?.username || t.assigned_to?.employeeName || t.assignedTo?.name || t.assignedTo?.username || 'Staff';

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
        kpi: t.title,
        target: formattedDueDate,
        achieved: statusText
      };
    });
  } catch (error) {
    console.error('Error fetching delegated tasks for report:', error);
    return [];
  }
};
