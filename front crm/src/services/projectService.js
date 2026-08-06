import axios from 'axios';

const getBaseUrl = () => {
  const host = import.meta.env.VITE_API_URL || '/api';
  return `${host.replace(/\/+$/, '')}/v1/projects`;
};

const getAuthHeaders = () => {
  let token = localStorage.getItem('token') || '';
  token = token.replace(/^"(.*)"$/, '$1').trim();
  if (token.startsWith('Bearer ')) {
    token = token.slice(7).trim();
  }
  return {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
};

export const getProjects = async (params = {}) => {
  const response = await axios.get(getBaseUrl(), {
    ...getAuthHeaders(),
    params
  });
  return response.data;
};

export const getProjectById = async (id) => {
  const response = await axios.get(`${getBaseUrl()}/${id}`, getAuthHeaders());
  return response.data;
};

export const createProject = async (projectData) => {
  const response = await axios.post(getBaseUrl(), projectData, getAuthHeaders());
  return response.data;
};

export const updateProject = async (id, projectData) => {
  const response = await axios.put(`${getBaseUrl()}/${id}`, projectData, getAuthHeaders());
  return response.data;
};

export const updateProjectStatus = async (id, statusData) => {
  const response = await axios.patch(`${getBaseUrl()}/${id}/status`, statusData, getAuthHeaders());
  return response.data;
};

export const assignProjectWork = async (id, assignmentData) => {
  const response = await axios.post(`${getBaseUrl()}/${id}/assign`, assignmentData, getAuthHeaders());
  return response.data;
};

export const getVisibleWork = async (id) => {
  const response = await axios.get(`${getBaseUrl()}/${id}/visible-work`, getAuthHeaders());
  return response.data;
};

export const getProjectReports = async () => {
  const response = await axios.get(`${getBaseUrl()}/reports`, getAuthHeaders());
  return response.data;
};

export const deleteProject = async (id) => {
  const response = await axios.delete(`${getBaseUrl()}/${id}`, getAuthHeaders());
  return response.data;
};

export const fetchActiveEmployees = async (params = {}) => {
  const host = import.meta.env.VITE_API_URL || '/api';
  const cleanHost = host.replace(/\/+$/, '');
  const listUrl = cleanHost.endsWith('/v1') ? `${cleanHost}/users/list` : `${cleanHost}/v1/users/list`;
  
  try {
    const response = await axios.get(listUrl, {
      ...getAuthHeaders(),
      params
    });
    return response.data;
  } catch (err) {
    const fallbackUrl = cleanHost.endsWith('/v1') ? `${cleanHost}/users` : `${cleanHost}/v1/users`;
    const fallbackRes = await axios.get(fallbackUrl, {
      ...getAuthHeaders(),
      params
    });
    return fallbackRes.data;
  }
};

export const fetchDepartments = async () => {
  const host = import.meta.env.VITE_API_URL || '/api';
  const deptUrl = `${host.replace(/\/+$/, '')}/v1/departments`;
  const response = await axios.get(deptUrl, getAuthHeaders());
  return response.data;
};

export const fetchDesignations = async () => {
  const host = import.meta.env.VITE_API_URL || '/api';
  const desigUrl = `${host.replace(/\/+$/, '')}/v1/designations`;
  const response = await axios.get(desigUrl, getAuthHeaders());
  return response.data;
};
