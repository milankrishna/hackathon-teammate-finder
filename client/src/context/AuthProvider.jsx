import { useCallback, useEffect, useRef, useState } from 'react'
import api, { AUTH_FAILURE_EVENT, TOKEN_KEY, clearToken, readToken, saveToken } from '../services/api'
import { AuthContext } from './authContext'

const signedOut = { user: null, token: null, isRestoring: false, restoreError: '' }

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    const token = readToken()
    return { ...signedOut, token, isRestoring: Boolean(token) }
  })
  const generation = useRef(0)

  const logout = useCallback(() => {
    generation.current += 1
    clearToken()
    setSession(signedOut)
  }, [])

  const loadSession = useCallback((token) => {
    const current = ++generation.current
    return api.get('/auth/me').then(({ data }) => {
      if (current === generation.current) {
        setSession({ user: data.user, token, isRestoring: false, restoreError: '' })
      }
    }).catch((error) => {
      if (current !== generation.current) return
      if (error.status === 401) {
        logout()
      } else {
        // Keep credentials on network/server failures so the user can retry.
        setSession({ user: null, token, isRestoring: false, restoreError: error.message })
      }
    })
  }, [logout])

  const restoreSession = useCallback(() => {
    const token = readToken()
    if (!token) {
      logout()
      return
    }
    setSession({ user: null, token, isRestoring: true, restoreError: '' })
    return loadSession(token)
  }, [loadSession, logout])

  useEffect(() => {
    const token = readToken()
    if (token) loadSession(token)
    const onStorage = (event) => {
      if (event.key === TOKEN_KEY || event.key === null) restoreSession()
    }
    window.addEventListener(AUTH_FAILURE_EVENT, logout)
    window.addEventListener('storage', onStorage)
    return () => {
      generation.current += 1
      window.removeEventListener(AUTH_FAILURE_EVENT, logout)
      window.removeEventListener('storage', onStorage)
    }
  }, [loadSession, logout, restoreSession])

  async function authenticate(path, fields) {
    const current = ++generation.current
    const { data } = await api.post(path, fields)
    if (current !== generation.current) return
    saveToken(data.token)
    setSession({ user: data.user, token: data.token, isRestoring: false, restoreError: '' })
  }

  const value = {
    ...session,
    login: (fields) => authenticate('/auth/login', fields),
    register: (fields) => authenticate('/auth/register', fields),
    logout,
    restoreSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
