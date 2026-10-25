import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import useApiResource from '../hooks/useApiResource'
import PageState from '../components/PageState'
import { formatHackathonDate } from '../services/teamPresentation'

export default function MyTeams() {
  const { user } = useAuth()
  const location = useLocation()
  const { data, loading, error, reload } = useApiResource('/teams/mine', user.id)

  return (
    <section>
      <div className="management-heading"><div className="page-heading"><span className="eyebrow">YOUR IDEAS, YOUR TEAMS</span><h1>My Teams</h1><p>Manage the teams you’ve created and welcome your next collaborators.</p></div><Link className="button" to="/teams/new">Create Team <span aria-hidden="true">+</span></Link></div>
      {location.state?.notice && <p className="success-banner" role="status">{location.state.notice}</p>}
      {loading ? <PageState title="Loading your teams" headingAs="h2" loading>Getting your workspace ready…</PageState> : error ? <PageState title="We couldn’t load your teams" headingAs="h2" error actions={<button className="button" onClick={reload}>Try again</button>}>{error.message}</PageState> : !data.teams.length ? <PageState title="Your first team starts with an idea" headingAs="h2" actions={<Link className="button" to="/teams/new">Create your first team</Link>}>You haven’t created any teams yet. Start one and find people who share your ambition.</PageState> : <div className="teams-grid">{data.teams.map((team) => <article className="panel team-card" key={team._id}><div className="team-card-top"><span className={`capacity-badge${team.members.length >= team.maxTeamSize ? ' is-full' : ''}`}>{team.members.length >= team.maxTeamSize ? 'Full' : 'Available'}</span><span className="muted capacity-count">{team.members.length} / {team.maxTeamSize} members</span></div><h2><Link to={`/teams/${team._id}`}>{team.hackathonName}</Link></h2><time className="team-date" dateTime={team.hackathonDate}>{formatHackathonDate(team.hackathonDate)}</time><p className="team-excerpt">{team.description}</p><div className="button-row owned-team-actions"><Link className="button button-small" to={`/teams/${team._id}`}>View details</Link><Link className="button button-small button-secondary" to={`/teams/${team._id}/edit`}>Edit team</Link><Link className="button button-small button-secondary" to={`/teams/${team._id}/manage`}>Manage requests</Link></div></article>)}</div>}
    </section>
  )
}
