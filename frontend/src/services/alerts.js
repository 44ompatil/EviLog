import { request } from './api'

export const alertsApi = {
  list: () => request('/api/alerts'),
  markRead: (alertId) => request(`/api/alerts/${encodeURIComponent(alertId)}/read`, { method: 'PATCH' }),
  markAllRead: () => request('/api/alerts/read-all', { method: 'POST' }),
  transactions: () => request('/api/transactions'),
  enrollFace: (officerId, samples) => request('/api/face-auth/enroll', {
    method: 'POST',
    body: JSON.stringify({ officer_id: officerId, samples }),
  }),
  prepareFaceEnrollment: (samples) => request('/api/face-auth/prepare-enrollment', {
    method: 'POST',
    body: JSON.stringify({ samples }),
  }),
  cancelFaceEnrollment: (officerId) => request(`/api/face-auth/enrollment/${encodeURIComponent(officerId)}`, {
    method: 'DELETE',
  }),
}
