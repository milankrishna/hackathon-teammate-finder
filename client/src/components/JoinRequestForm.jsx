import { useRef, useState } from 'react'
import useApiResource from '../hooks/useApiResource'
import api from '../services/api'
import { referenceId } from '../services/teamPresentation'

export default function JoinRequestForm({ team, user, onRefresh }) {
  const { data, loading, error: historyError, reload } = useApiResource('/requests/mine', user.id)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createdRequest, setCreatedRequest] = useState(null)
  const [reportedFull, setReportedFull] = useState(false)
  const busy = useRef(false)
  const feedback = useRef(null)
  const full = reportedFull || team.members.length >= team.maxTeamSize
  const existing = createdRequest || data?.requests.find((request) => referenceId(request.team) === team._id)

  async function submit(event) {
    event.preventDefault()
    if (busy.current || full || existing || loading || historyError) return
    if (message.length > 300) {
      setError('Your message must be at most 300 characters.')
      feedback.current?.focus()
      return
    }
    busy.current = true
    setSubmitting(true)
    setError('')
    try {
      const { data: response } = await api.post(`/teams/${team._id}/requests`, { message: message.trim() })
      setCreatedRequest(response.request)
      setMessage('')
    } catch (requestError) {
      setError(requestError.message)
      if (requestError.status === 409 && requestError.message === 'Team is full.') setReportedFull(true)
      feedback.current?.focus()
    } finally {
      busy.current = false
      setSubmitting(false)
    }
  }

  if (existing) {
    const pending = existing.status === 'pending'
    return <div className="request-confirmation" role="status"><span className="eyebrow">{pending ? 'REQUEST SENT' : 'YOUR REQUEST'}</span><h3>{pending ? 'Your request is pending' : existing.status === 'accepted' ? 'Your request was accepted' : 'Your request was rejected'}</h3><p>{pending ? 'The team creator will review your request. You don’t need to submit it again.' : existing.status === 'accepted' ? 'You’re part of this team. Refresh the details to see the latest members.' : 'This team has already reviewed your request. Rejected requests cannot be submitted again, but you can explore other teams.'}</p>{existing.status === 'accepted' && <button className="button button-secondary" onClick={onRefresh}>Refresh team details</button>}</div>
  }
  if (loading) return <p className="muted" role="status">Checking your existing requests…</p>
  if (historyError) return <div><p className="error-banner" role="alert">{historyError.message}</p><button className="button button-secondary" onClick={reload}>Retry request check</button></div>

  return (
    <form onSubmit={submit} aria-busy={submitting}>
      <p className="muted join-intro">Introduce yourself and tell the creator what you’d like to bring to the team.</p>
      {full && <p className="notice-banner" role="status">This team is full. New join requests are unavailable.</p>}
      <div ref={feedback} tabIndex={-1} className={error ? 'error-banner' : 'sr-only'} role="alert">{error}</div>
      <div className="field"><label htmlFor="join-message">Message <span className="optional">(optional)</span></label><textarea id="join-message" name="message" rows={5} maxLength={300} value={message} onChange={(event) => setMessage(event.target.value)} disabled={submitting || full} aria-describedby="join-message-hint" /><span id="join-message-hint" className="field-hint">{message.length} / 300 characters</span></div>
      <button className="button button-full" type="submit" disabled={submitting || full}>{submitting ? 'Sending request…' : full ? 'Team full' : 'Send join request'}</button>
      {error && <button className="button button-secondary button-full" type="button" disabled={submitting} onClick={onRefresh}>Refresh team and request status</button>}
      <span className="sr-only" role="status">{submitting ? 'Sending your join request. Please wait.' : ''}</span>
    </form>
  )
}
