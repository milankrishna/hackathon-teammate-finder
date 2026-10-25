import { Link, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import useApiResource from '../hooks/useApiResource'
import PageState from '../components/PageState'
import JoinRequestForm from '../components/JoinRequestForm'
import { formatHackathonDate, referenceId } from '../services/teamPresentation'

export default function TeamDetails() {
  const { id } = useParams()
  const location = useLocation()
  const { user } = useAuth()
  const { data, error, loading, reload } = useApiResource(`/teams/${encodeURIComponent(id)}`)
  const browseQuery = typeof location.state?.browseQuery === 'string' ? location.state.browseQuery : ''
  const backToTeams = `/teams${browseQuery ? `?${browseQuery}` : ''}`

  if (loading) return <PageState title="Loading team details" loading>Getting the team together…</PageState>
  if (error) return <PageState title={error.status === 404 ? 'Team not found' : error.status === 400 ? 'Invalid team link' : 'We couldn’t load this team'} error actions={<><button className="button" onClick={reload}>Try again</button><Link className="button button-secondary" to={backToTeams}>Back to teams</Link></>}>{error.message}</PageState>

  const { team } = data
  const full = team.members.length >= team.maxTeamSize
  const creator = user && referenceId(team.creator) === user.id
  const member = user && team.members.some((person) => referenceId(person) === user.id)

  return (
    <section>
      <Link className="back-link" to={backToTeams}>← Back to teams</Link>
      {location.state?.notice && <p className="success-banner" role="status">{location.state.notice}</p>}
      <div className="page-heading team-details-heading"><span className="eyebrow">YOUR NEXT COLLABORATION</span><h1>{team.hackathonName}</h1><div className="team-heading-meta"><time dateTime={team.hackathonDate}>{formatHackathonDate(team.hackathonDate)}</time><span className={`capacity-badge${full ? ' is-full' : ''}`}>{full ? 'Team full' : 'Open to requests'}</span></div></div>
      <div className="team-details-grid">
        <div className="team-details-main">
          <article className="panel detail-panel"><h2>About this hackathon team</h2><p className="team-description">{team.description}</p><h3>Skills needed</h3>{team.skillsNeeded.length ? <ul className="skill-list">{team.skillsNeeded.map((skill, index) => <li key={`${skill}-${index}`}>{skill}</li>)}</ul> : <p className="empty-note">No specific skills listed. Bring your curiosity.</p>}</article>
          <section className="panel detail-panel" aria-labelledby="members-title"><div className="results-heading"><h2 id="members-title">The team</h2><span className="muted">{team.members.length} / {team.maxTeamSize} members</span></div><p className="muted">Created by <strong>{team.creator?.name || 'Unavailable account'}</strong></p>{team.members.length ? <ul className="member-list">{team.members.map((person, index) => <li key={person?._id || index}><span className="member-avatar" aria-hidden="true">{person?.name?.slice(0, 1).toUpperCase() || '?'}</span><div><strong>{person?.name || 'Unavailable account'}</strong>{person?._id === referenceId(team.creator) && <span className="member-role">Creator</span>}{person?.skills?.length > 0 && <p className="muted">{person.skills.join(' · ')}</p>}</div></li>)}</ul> : <p className="empty-note">No current members to display.</p>}</section>
        </div>
        <aside className="panel join-panel" aria-labelledby="join-title"><span className="eyebrow">BUILD SOMETHING TOGETHER</span><h2 id="join-title">{creator ? 'You created this team' : member ? 'You’re on this team' : 'Interested in joining?'}</h2>
          {creator || member ? <p className="muted join-intro">{creator ? 'You’re the creator and already a member of this team.' : 'You’re already a member. There’s no need to send another request.'}</p> : !user ? <div><p className="muted join-intro">{full ? 'This team is full. You can still explore its details or look for another team.' : 'Log in to introduce yourself and send a join request to the team creator.'}</p>{full ? <Link className="button button-secondary button-full" to={backToTeams}>Explore other teams</Link> : <Link className="button button-full" to="/login" state={{ from: location.pathname + location.search }}>Login to request membership</Link>}</div> : <JoinRequestForm key={`${team._id}:${user.id}`} team={team} user={user} onRefresh={reload} />}
          {creator && <div className="creator-actions"><Link className="button button-full" to={`/teams/${team._id}/manage`}>Manage requests</Link><Link className="button button-secondary button-full" to={`/teams/${team._id}/edit`}>Edit team</Link></div>}
          <p className="join-footnote">Joining a team won’t remove you from any other teams.</p>
        </aside>
      </div>
    </section>
  )
}
