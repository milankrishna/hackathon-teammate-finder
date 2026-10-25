import { useEffect, useState } from 'react'
import api from '../services/api'

export default function useApiResource(url, scope = '') {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)
  const key = JSON.stringify([url, scope, attempt])

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    api.get(url, { signal: controller.signal }).then(({ data }) => {
      if (active) setResult({ key, data, error: null })
    }).catch((error) => {
      if (active) setResult({ key, data: null, error })
    })
    return () => {
      active = false
      controller.abort()
    }
  }, [url, key])

  const current = result?.key === key
  return {
    data: current ? result.data : null,
    error: current ? result.error : null,
    loading: !current,
    reload: () => setAttempt((previous) => previous + 1),
  }
}
