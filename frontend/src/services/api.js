const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, statusCode = 0) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
  }
}

export async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new ApiError('The EviLog API is unavailable. Check the backend connection and try again.')
  }

  if (response.status === 204) {
    if (!response.ok) throw new ApiError('The request could not be completed.', response.status)
    return null
  }

  let body
  try {
    body = await response.json()
  } catch {
    body = null
  }

  if (!response.ok) {
    const detail = typeof body?.detail === 'string' ? body.detail : ''
    const message = response.status === 409
      ? (detail || 'This record conflicts with existing data.')
      : response.status === 404
        ? (detail || 'The requested record was not found.')
        : response.status === 422
          ? 'Please check the entered information and try again.'
          : 'The request could not be completed. Please try again.'
    throw new ApiError(message, response.status)
  }

  return body
}

export const jsonBody = (value) => ({ body: JSON.stringify(value) })
