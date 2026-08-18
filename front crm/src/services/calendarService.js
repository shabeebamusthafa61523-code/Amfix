// Calendar Work Service
// Handles all API calls to the backend calendar-work endpoints

const baseUrl = () => (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

const headers = () => {
  const raw = localStorage.getItem('token') || '';
  const token = raw.replace(/^"(.*)"$/, '$1').replace(/"/g, '').replace(/^Bearer\s+/i, '').trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const request = async (path, options = {}) => {
  const url = `${baseUrl()}/v1/calendar-work/${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...headers(),
      ...(options.headers || {})
    }
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(body.message || 'Calendar work request failed');
    error.response = { status: response.status, data: body };
    throw error;
  }

  return body;
};

/**
 * Get all calendar work items with optional filters
 * @param {Object} filters - { workStatus, postingStatus, assignedTo, contentType, startDate, endDate, limit, skip }
 * @returns {Promise<Object>} - { success, data: { items, total, limit, skip, pages }, message }
 */
export const getCalendarWorks = (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.workStatus) params.append('workStatus', filters.workStatus);
  if (filters.postingStatus) params.append('postingStatus', filters.postingStatus);
  if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);
  if (filters.contentType) params.append('contentType', filters.contentType);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.skip) params.append('skip', filters.skip || 0);
  if (filters.department) params.append('department', filters.department);

  const queryString = params.toString();
  const path = queryString ? `?${queryString}` : '';

  return request(path);
};

/**
 * Get calendar work items assigned to the current user
 * @param {Object} filters - { workStatus, postingStatus, limit, skip }
 * @returns {Promise<Object>}
 */
export const getMyCalendarWork = (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.workStatus) params.append('workStatus', filters.workStatus);
  if (filters.postingStatus) params.append('postingStatus', filters.postingStatus);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.skip) params.append('skip', filters.skip || 0);

  const queryString = params.toString();
  const path = queryString ? `my-work?${queryString}` : 'my-work';

  return request(path);
};

/**
 * Get a single calendar work item by ID
 * @param {String} id - Calendar work item ID
 * @returns {Promise<Object>}
 */
export const getCalendarWorkById = (id) => {
  return request(`${id}`);
};

/**
 * Create a new calendar work item
 * @param {Object} data - Calendar work data
 * @returns {Promise<Object>}
 */
export const createCalendarWork = (data) => {
  return request('', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

/**
 * Update a calendar work item
 * @param {String} id - Calendar work item ID
 * @param {Object} data - Updated data
 * @returns {Promise<Object>}
 */
export const updateCalendarWork = (id, data) => {
  return request(`${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

/**
 * Update work status of a calendar work item
 * @param {String} id - Calendar work item ID
 * @param {Object} data - { status, notes }
 * @returns {Promise<Object>}
 */
export const updateWorkStatus = (id, data) => {
  return request(`${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
};

/**
 * Update posting status of a calendar work item
 * @param {String} id - Calendar work item ID
 * @param {Object} data - { status, actualPostTime, socialMediaLinks, notes }
 * @returns {Promise<Object>}
 */
export const updatePostingStatus = (id, data) => {
  return request(`${id}/posting-status`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
};

/**
 * Delete a calendar work item
 * @param {String} id - Calendar work item ID
 * @returns {Promise<Object>}
 */
export const deleteCalendarWork = (id) => {
  return request(`${id}`, {
    method: 'DELETE'
  });
};

export default {
  getCalendarWorks,
  getMyCalendarWork,
  getCalendarWorkById,
  createCalendarWork,
  updateCalendarWork,
  updateWorkStatus,
  updatePostingStatus,
  deleteCalendarWork
};
