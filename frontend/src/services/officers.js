import { jsonBody, request } from './api'

export const officersApi = {
  list: () => request('/api/officers'),
  get: (officerId) => request(`/api/officers/${encodeURIComponent(officerId)}`),
  create: (data) => request('/api/officers', { method: 'POST', ...jsonBody(data) }),
  update: (officerId, data) => request(`/api/officers/${encodeURIComponent(officerId)}`, { method: 'PUT', ...jsonBody(data) }),
  delete: (officerId) => request(`/api/officers/${encodeURIComponent(officerId)}`, { method: 'DELETE' }),
}
