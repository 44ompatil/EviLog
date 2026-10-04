import { jsonBody, request } from './api'

export const rfidApi = {
  list: () => request('/api/rfid'),
  mappings: () => request('/api/rfid/mappings'),
  assign: (data) => request('/api/rfid/assign', { method: 'POST', ...jsonBody(data) }),
  release: (data) => request('/api/rfid/release', { method: 'POST', ...jsonBody(data) }),
}
