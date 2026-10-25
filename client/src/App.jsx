import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { AdminRoute, GuestRoute, ProtectedRoute } from './components/RouteGuards'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import BrowseTeams from './pages/BrowseTeams'
import TeamDetails from './pages/TeamDetails'
import CreateTeam from './pages/CreateTeam'
import MyTeams from './pages/MyTeams'
import EditTeam from './pages/EditTeam'
import ManageRequests from './pages/ManageRequests'
import MyRequests from './pages/MyRequests'
import Admin from './pages/Admin'
import NotFound from './pages/NotFound'
import './App.css'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="teams" element={<BrowseTeams />} />
        <Route path="teams/:id" element={<TeamDetails />} />
        <Route element={<GuestRoute />}>
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="teams/new" element={<CreateTeam />} />
          <Route path="my-teams" element={<MyTeams />} />
          <Route path="teams/:id/edit" element={<EditTeam />} />
          <Route path="teams/:id/manage" element={<ManageRequests />} />
          <Route path="my-requests" element={<MyRequests />} />
          <Route element={<AdminRoute />}>
            <Route path="admin" element={<Admin />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
