import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import useApiResource from '../hooks/useApiResource'
import PageState from '../components/PageState'
import api from '../services/api'
import { referenceId, formatSubmissionDate } from '../services/teamPresentation'

function RequestManager({ initialTeam, user }) {
  const [team, setTeam] = useState(initialTeam)
  const { data, loading, error: listError, reload } = useApiResource(`/teams/${team._id}/requests`, user.id)
  const [processing, setProcessing] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [capacityError, setCapacityError] = useState('')
  const [fatalStatus, setFatalStatus] = useState(null)
  const busy = useRef(false)
  const full = team.members.length >= team.maxTeamSize

  async function refreshCapacity() {
    try {
      const { data: response } = await api.get(`/teams/${team._id}`)
      setTeam(response.team)
      setCapacityError('')
    } catch (refreshError) {
      setCapacityError(refreshError.message)
      if (refreshError.status === 403 || refreshError.status === 404) setFatalStatus(refreshError.status)
    }
  }

  async function decide(request, status) {
    if (busy.current || loading || capacityError || request.status !== 'pending') return
    busy.current = true
    setProcessing({ id: request._id, status })
    setError('')
    setSuccess('')
    try {
      await api.patch(`/teams/${team._id}/requests/${request._id}`, { status })
      setSuccess(status === 'accepted' ? 'Request accepted. Team membership has been updated.' : 'Request rejected. Team membership is unchanged.')
    } catch (decisionError) {
      setError(decisionError.message)
      if (decisionError.status === 403 || decisionError.status === 404) setFatalStatus(decisionError.status)
    } finally {
      await refreshCapacity()
      reload()
      busy.current = false
      setProcessing(null)
    }
  }

  async function refresh() {
    if (busy.current) return
    busy.current = true
    setProcessing({ id: null, status: 'refresh' })
    await refreshCapacity()
    reload()
    busy.current = false
    setProcessing(null)
  }

  if (fatalStatus || referenceId(team.creator) !== user.id) return <PageState title={fatalStatus === 404 ? 'Team or request no longer available' : 'Request management is not permitted'} error actions={<Link className="button" to="/my-teams">Back to My Teams</Link>}>{error || capacityError || 'Only the team creator can manage requests.'}</PageState>

  return (
    <>
      <div className="panel management-summary"><div><span className={`capacity-badge${full ? ' is-full' : ''}`}>{full ? 'Team full' : 'Open slots'}</span><p><strong>{team.members.length} / {team.maxTeamSize}</strong> members</p></div><button className="button button-secondary" disabled={Boolean(processing) || loading} onClick={refresh}>{processing?.status === 'refresh' ? 'Refreshing…' : 'Refresh requests & capacity'}</button></div>
      {success && <p className="success-banner" role="status">{success}</p>}
      {error && <p className="error-banner" role="alert">{error} {error.includes('full') && 'The request remains pending while the team is full.'}</p>}
      {capacityError && <p className="error-banner" role="alert">Team capacity could not be refreshed: {capacityError} Use the refresh button before making another decision.</p>}
      {full && <p className="notice-banner">This team is full. Pending requests stay pending unless you reject them or increase capacity in <Link to={`/teams/${team._id}/edit`}>Edit team</Link>.</p>}
      {loading ? <PageState title="Loading requests" headingAs="h2" loading>Checking the latest request statuses…</PageState> : listError ? <PageState title={listError.status === 403 ? 'Only the creator can view requests' : 'We couldn’t load requests'} headingAs="h2" error actions={<button className="button" onClick={reload}>Try again</button>}>{listError.message}</PageState> : !data.requests.length ? <PageState title="No join requests yet" headingAs="h2" actions={<Link className="button button-secondary" to={`/teams/${team._id}`}>View team details</Link>}>When people request to join your team, their introductions will appear here.</PageState> : <div className="request-list">{data.requests.map((request) => {
        const ownRequest = referenceId(request.requester) === user.id
        const canDecide = request.status === 'pending' && !ownRequest && request.requester
        const locked = Boolean(processing) || Boolean(capacityError)
        return <article key={request._id} className="panel request-card"><div className="request-card-heading"><div><h2>{request.requester?.name || 'Unavailable account'}</h2><time dateTime={request.createdAt}>{formatSubmissionDate(request.createdAt)}</time></div><span className={`request-status status-${request.status}`}>{request.status}</span></div><h3 className="sr-only">Requester skills</h3>{request.requester?.skills.length ? <ul className="skill-list">{request.requester.skills.map((skill, index) => <li key={`${skill}-${index}`}>{skill}</li>)}</ul> : <p className="empty-note">No skills listed.</p>}<p className="request-message">{request.message || 'No message included.'}</p>{canDecide && <div className="button-row"><button className="button" disabled={locked || full} onClick={() => decide(request, 'accepted')} aria-label={`Accept request from ${request.requester.name}`}>{processing?.id === request._id && processing.status === 'accepted' ? 'Accepting…' : 'Accept'}</button><button className="button button-secondary" disabled={locked} onClick={() => decide(request, 'rejected')} aria-label={`Reject request from ${request.requester.name}`}>{processing?.id === request._id && processing.status === 'rejected' ? 'Rejecting…' : 'Reject'}</button></div>}{ownRequest && request.status === 'pending' && <p className="empty-note">Creators cannot approve their own membership requests.</p>}</article>
      })}</div>}
    </>
  )
}

export default function ManageRequests() {
  const { id } = useParams()
  const { user } = useAuth()
  const { data, loading, error, reload } = useApiResource(`/teams/${encodeURIComponent(id)}`, user.id)
  if (loading) return <PageState title="Loading request management" loading>Checking your team and permissions…</PageState>
  if (error) return <PageState title={error.status === 404 ? 'Team not found' : 'Request management unavailable'} error actions={<><button className="button" onClick={reload}>Try again</button><Link className="button button-secondary" to="/my-teams">My Teams</Link></>}>{error.message}</PageState>
  if (referenceId(data.team.creator) !== user.id) return <PageState title="Only the creator can manage requests" error actions={<Link className="button" to={`/teams/${data.team._id}`}>View team</Link>}>You don’t have permission to view or decide this team’s join requests.</PageState>
  return <section><Link className="back-link" to="/my-teams">← My Teams</Link><div className="management-heading"><div className="page-heading"><span className="eyebrow">WELCOME YOUR NEXT COLLABORATORS</span><h1>Manage requests</h1><p>{data.team.hackathonName}</p></div><Link className="button button-secondary" to={`/teams/${data.team._id}`}>View team details</Link></div><RequestManager key={`${data.team._id}:${user.id}`} initialTeam={data.team} user={user} /></section>
}
