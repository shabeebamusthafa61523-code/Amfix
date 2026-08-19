// The backend mounts the task router at /api/tasks. VITE_API_URL is the
// application API root (for example, http://localhost:5000/api), not /api/v1.
const baseUrl = () => (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

const headers = () => {
  const raw = localStorage.getItem('token') || '';
  const token = raw.replace(/^"(.*)"$/, '$1').replace(/"/g, '').replace(/^Bearer\s+/i, '').trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl()}/tasks/${path}`, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.message || 'Task collaboration request failed'), { response: { status: response.status, data: body } });
  return body;
};

export const getTaskComments = taskId => request(`${taskId}/comments`);
export const addTaskComment = (taskId, comment, files = []) => {
  const formData = new FormData();
  if (comment?.trim()) formData.append('comment', comment.trim());
  files.forEach(file => formData.append('file', file));
  return request(`${taskId}/comments`, { method: 'POST', body: formData });
};
export const updateTaskComment = (taskId, commentId, comment) => request(`${taskId}/comments/${commentId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comment }) });
export const deleteTaskComment = (taskId, commentId) => request(`${taskId}/comments/${commentId}`, { method: 'DELETE' });
export const uploadTaskAttachments = (taskId, files) => {
  const formData = new FormData();
  files.forEach(file => formData.append('file', file));
  return request(`${taskId}/attachments`, { method: 'POST', body: formData });
};
export const deleteTaskAttachment = (taskId, attachmentId) => request(`${taskId}/attachments/${attachmentId}`, { method: 'DELETE' });
