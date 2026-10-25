import { Link } from 'react-router-dom'
import { formatSubmissionDate } from '../services/teamPresentation'

const statusLabels = { pending: 'Pending', accepted: 'Accepted', rejected: 'Rejected' }

export default function RequestHistoryCard({ request }) {
  return (
    <article className="panel request-card">
      <div className="request-card-heading"><div><h2>{request.team?.hackathonName || 'Team no longer available'}</h2><time dateTime={request.createdAt}>Submitted {formatSubmissionDate(request.createdAt)}</time></div><span className={`request-status status-${request.status}`}>{statusLabels[request.status] || 'Unknown'}</span></div>
      <p className="request-message">{request.message || 'No message included.'}</p>
      {request.team?._id ? <Link className="button button-secondary button-small" to={`/teams/${request.team._id}`}>View team details</Link> : <p className="empty-note">This team is no longer available to view.</p>}
    </article>
  )
}
