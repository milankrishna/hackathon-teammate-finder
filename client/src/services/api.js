import axios from 'axios'

export const TOKEN_KEY = 'hackathon-team-finder.token'
export const AUTH_FAILURE_EVENT = 'hackathon-team-finder:unauthorized'

export function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // The in-memory session can still be cleared when storage is unavailable.
  }
}

export function saveToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    throw new Error('Browser storage is unavailable. Please enable site storage and try again.')
  }
}

const api = axios.create({ baseURL: '/api', timeout: 15000 })

api.interceptors.request.use((config) => {
  const token = readToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

api.interceptors.response.use((response) => response, (error) => {
  const status = error.response?.status
  const isSignInRequest = ['/auth/login', '/auth/register'].includes(error.config?.url)
  const token = readToken()
  // Ignore failures from older sessions, and don't log out on a mistyped password.
  if (status === 401 && !isSignInRequest && token &&
      error.config?.headers?.get('Authorization') === `Bearer ${token}`) {
    clearToken()
    window.dispatchEvent(new Event(AUTH_FAILURE_EVENT))
  }

  const message = typeof error.response?.data?.error === 'string'
    ? error.response.data.error
    : status ? 'Something went wrong. Please try again.'
      : 'Unable to reach the server. Check your connection and try again.'
  // Return a small error, without Axios request headers or submitted credentials.
  const apiError = new Error(message)
  apiError.status = status
  return Promise.reject(apiError)
})

export default api
