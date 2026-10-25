import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import { authDestination } from '../services/navigation'
import PageState from './PageState'

export function ProtectedRoute() {
  const { user } = useAuth()
  const location = useLocation()
  return user ? <Outlet /> : <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
}

export function GuestRoute() {
  const { user } = useAuth()
  const location = useLocation()
  return user ? <Navigate to={authDestination(location.state)} replace /> : <Outlet />
}

export function AdminRoute() {
  const { user } = useAuth()
  return user?.role === 'admin' ? <Outlet /> : <PageState title="Admin access required" error actions={<Link className="button" to="/dashboard">Back to dashboard</Link>}>You don’t have permission to moderate teams.</PageState>
}
