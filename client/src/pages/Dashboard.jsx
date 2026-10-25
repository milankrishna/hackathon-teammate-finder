import { Link } from 'react-router-dom'
import { useAuth } from '../context/authContext'

export default function Dashboard() {
  const { user } = useAuth()
  return (
    <section className="dashboard">
      <div className="page-heading"><span className="eyebrow">YOUR WORKSPACE</span><h1>Welcome, {user.name}.</h1><p>You bring the skills. Let’s make room for your next big idea.</p></div>
      <div className="dashboard-grid">
        <article className="panel profile-card">
          <span className="avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
          <h2>{user.name}</h2><p className="muted profile-email">{user.email}</p>
          <h3>Your skills</h3>
          {user.skills.length ? <ul className="skill-list">{user.skills.map((skill, index) => <li key={`${skill}-${index}`}>{skill}</li>)}</ul> : <p className="empty-note">No skills added yet. You’re still welcome to explore and learn.</p>}
        </article>
        <article className="panel next-step-card"><span className="eyebrow">WHAT’S NEXT</span><h2>Your next team is a new beginning.</h2><p>Explore hackathon teams, find an idea that excites you, and send a request to introduce yourself.</p><Link className="button" to="/teams">Browse Teams <span aria-hidden="true">↗</span></Link></article>
      </div>
      <section className="dashboard-shortcuts" aria-labelledby="shortcuts-title"><h2 id="shortcuts-title">Make your next move</h2><div className="shortcut-grid"><Link className="panel shortcut-card" to="/teams"><h3>Browse Teams ↗</h3><p>Discover hackathons and collaborators.</p></Link><Link className="panel shortcut-card" to="/my-teams"><h3>My Teams ↗</h3><p>Manage the teams you’ve created.</p></Link><Link className="panel shortcut-card" to="/teams/new"><h3>Create Team ↗</h3><p>Bring your own idea to life.</p></Link><Link className="panel shortcut-card" to="/my-requests"><h3>My Requests ↗</h3><p>Track your pending, accepted, and rejected join requests.</p></Link>{user.role === 'admin' && <Link className="panel shortcut-card" to="/admin"><h3>Admin ↗</h3><p>Review and moderate teams across the platform.</p></Link>}</div></section>
    </section>
  )
}
