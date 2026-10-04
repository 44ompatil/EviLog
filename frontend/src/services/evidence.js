import { jsonBody, request } from './api'

export const evidenceApi = {
  list: () => request('/api/evidence'),
  get: (evidenceId) => request(`/api/evidence/${encodeURIComponent(evidenceId)}`),
  create: (data) => request('/api/evidence', { method: 'POST', ...jsonBody(data) }),
  update: (evidenceId, data) => request(`/api/evidence/${encodeURIComponent(evidenceId)}`, { method: 'PUT', ...jsonBody(data) }),
  delete: (evidenceId) => request(`/api/evidence/${encodeURIComponent(evidenceId)}`, { method: 'DELETE' }),
  getCustody: (evidenceId) => request(`/api/evidence/${encodeURIComponent(evidenceId)}/custody`),
}
