import { Link } from 'react-router-dom'
import { formatHackathonDate } from '../services/teamPresentation'

export default function TeamCard({ team, browseQuery }) {
  const full = team.members.length >= team.maxTeamSize
  return (
    <article className="panel team-card">
      <div className="team-card-top"><span className={`capacity-badge${full ? ' is-full' : ''}`}>{full ? 'Full' : 'Available'}</span><span className="muted capacity-count">{team.members.length} / {team.maxTeamSize} members</span></div>
      <h2><Link to={`/teams/${team._id}`} state={{ browseQuery }}>{team.hackathonName}</Link></h2>
      <time className="team-date" dateTime={team.hackathonDate}>{formatHackathonDate(team.hackathonDate)}</time>
      <p className="team-excerpt">{team.description}</p>
      <div className="team-card-skills"><h3 className="sr-only">Skills needed</h3>
        {team.skillsNeeded.length ? <ul className="skill-list">{team.skillsNeeded.map((skill, index) => <li key={`${skill}-${index}`}>{skill}</li>)}</ul> : <p className="muted">No specific skills listed</p>}
      </div>
      <div className="team-card-footer"><span className="muted">Created by <strong>{team.creator?.name || 'Unavailable account'}</strong></span><Link to={`/teams/${team._id}`} state={{ browseQuery }} className="button button-secondary button-small" aria-label={`View details for ${team.hackathonName}`}>View details <span aria-hidden="true">↗</span></Link></div>
    </article>
  )
}
