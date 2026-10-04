import { jsonBody, request } from './api'

export const casesApi = {
  list: () => request('/api/cases'),
  get: (caseId) => request(`/api/cases/${encodeURIComponent(caseId)}`),
  create: (data) => request('/api/cases', { method: 'POST', ...jsonBody(data) }),
  update: (caseId, data) => request(`/api/cases/${encodeURIComponent(caseId)}`, { method: 'PUT', ...jsonBody(data) }),
  delete: (caseId) => request(`/api/cases/${encodeURIComponent(caseId)}`, { method: 'DELETE' }),
}
