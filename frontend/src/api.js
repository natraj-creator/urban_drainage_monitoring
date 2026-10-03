import axios from 'axios';

const API_BASE = '/api';

export const api = axios.create({ baseURL: API_BASE });

export const getNodes = () => api.get('/nodes').then((r) => r.data);

export const getNodeHistory = (nodeId, limit = 50) =>
  api.get(`/nodes/${nodeId}/history`, { params: { limit } }).then((r) => r.data);

export const getAlerts = (resolved) =>
  api.get('/alerts', { params: { resolved } }).then((r) => r.data);

export const resolveAlert = (alertId) =>
  api.post(`/alerts/${alertId}/resolve`).then((r) => r.data);
