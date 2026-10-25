import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import PageState from './PageState'

export default function Layout() {
  const { user, logout, isRestoring, restoreError, restoreSession } = useAuth()
  const location = useLocation()
  const authState = { from: location.state?.from || location.pathname + location.search }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header">
        <div className="header-inner container">
          <Link to="/" className="brand" aria-label="Hackathon Team Finder home">
            <span className="brand-mark" aria-hidden="true">{'<>'}</span>
            <span>Hackathon <strong>Team Finder</strong></span>
          </Link>
          <nav aria-label="Main navigation">
            {isRestoring ? <span className="muted nav-status">Restoring session…</span> : user ? (
              <>
                <NavLink to="/dashboard">Dashboard</NavLink>
                <NavLink to="/teams" end>Browse Teams</NavLink>
                <NavLink to="/my-teams">My Teams</NavLink>
                <NavLink to="/my-requests">My Requests</NavLink>
                {user.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
                <NavLink to="/teams/new" className="button button-small">Create Team</NavLink>
                <button className="button button-small button-secondary" onClick={logout}>Logout</button>
              </>
            ) : (
              <>
                <NavLink to="/" end>Home</NavLink>
                <NavLink to="/teams">Browse Teams</NavLink>
                <NavLink to="/login" state={authState}>Login</NavLink>
                <NavLink to="/register" state={authState} className="button button-small">Register</NavLink>
              </>
            )}
          </nav>
        </div>
      </header>
      <main id="main-content" className="container main-content" tabIndex={-1}>
        {isRestoring ? (
          <PageState title="Getting things ready" loading>Restoring your secure session…</PageState>
        ) : restoreError ? (
          <PageState title="We couldn’t restore your session" error actions={(
            <>
              <button className="button" onClick={restoreSession}>Try again</button>
              <button className="button button-secondary" onClick={logout}>Clear session</button>
            </>
          )}>{restoreError}</PageState>
        ) : <Outlet />}
      </main>
      <footer className="site-footer container">
        <span>Good ideas start with the right team.</span>
        <span>Hackathon Team Finder · College MERN capstone</span>
      </footer>
    </div>
  )
}
