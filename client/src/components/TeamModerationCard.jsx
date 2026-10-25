import { Link } from 'react-router-dom'
import { formatSubmissionDate } from '../services/teamPresentation'

export default function TeamModerationCard({ team, disabled, onDelete }) {
  return (
    <article className="panel team-card">
      <div className="team-card-top"><span className={`capacity-badge${team.members.length >= team.maxTeamSize ? ' is-full' : ''}`}>{team.members.length >= team.maxTeamSize ? 'Full' : 'Available'}</span><span className="muted capacity-count">{team.members.length} / {team.maxTeamSize} members</span></div>
      <h2><Link to={`/teams/${team._id}`}>{team.hackathonName}</Link></h2>
      <p className="moderation-creator">Created by <strong>{team.creator?.name || 'Unavailable account'}</strong></p>
      <time className="moderation-date" dateTime={team.createdAt}>Created {formatSubmissionDate(team.createdAt)}</time>
      <div className="button-row owned-team-actions"><Link className="button button-secondary button-small" to={`/teams/${team._id}`}>View details</Link><button className="button button-danger button-small" disabled={disabled} onClick={() => onDelete(team)} aria-label={`Delete team ${team.hackathonName}`}>Delete Team</button></div>
    </article>
  )
}
