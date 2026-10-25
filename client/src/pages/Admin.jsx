import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import useApiResource from '../hooks/useApiResource'
import PageState from '../components/PageState'
import DeleteTeamDialog from '../components/DeleteTeamDialog'
import TeamModerationCard from '../components/TeamModerationCard'
import api from '../services/api'

export default function Admin() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useApiResource('/admin/teams', user.id)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [notice, setNotice] = useState('')
  const [forbidden, setForbidden] = useState(false)
  const busy = useRef(false)

  async function remove() {
    if (busy.current || !selectedTeam) return
    busy.current = true
    setDeleting(true)
    setDeleteError('')
    try {
      await api.delete(`/admin/teams/${selectedTeam._id}`)
      setSelectedTeam(null)
      setNotice('Team and associated join requests deleted successfully.')
      reload()
    } catch (requestError) {
      if (requestError.status === 403) {
        setForbidden(true)
        setSelectedTeam(null)
      } else if (requestError.status === 404) {
        setSelectedTeam(null)
        setNotice('This team is no longer available. The list has been refreshed.')
        reload()
      } else {
        setDeleteError(requestError.message)
      }
    } finally {
      busy.current = false
      setDeleting(false)
    }
  }

  if (forbidden || error?.status === 403) return <PageState title="Admin access required" error actions={<Link className="button" to="/dashboard">Back to dashboard</Link>}>Your account no longer has permission to moderate teams. Only current administrators can use this page.</PageState>

  return (
    <section>
      <div className="management-heading"><div className="page-heading"><span className="eyebrow">ADMIN WORKSPACE</span><h1>Team moderation</h1><p>Review teams across the platform and remove teams when needed.</p></div><button className="button button-secondary" disabled={loading || deleting} onClick={reload}>Refresh teams</button></div>
      {notice && <p className="success-banner" role="status">{notice}</p>}
      {loading ? <PageState title="Loading all teams" headingAs="h2" loading>Getting the latest teams for moderation…</PageState> : error ? <PageState title="We couldn’t load teams" headingAs="h2" error actions={<button className="button" onClick={reload}>Try again</button>}>{error.message}</PageState> : !data.teams.length ? <PageState title="No teams to moderate" headingAs="h2">New teams will appear here when students create them.</PageState> : <><p className="moderation-total muted" role="status">{data.teams.length} {data.teams.length === 1 ? 'team' : 'teams'}, newest first</p><div className="teams-grid">{data.teams.map((team) => <TeamModerationCard key={team._id} team={team} disabled={deleting} onDelete={(value) => { setDeleteError(''); setSelectedTeam(value) }} />)}</div></>}
      {selectedTeam && <DeleteTeamDialog teamName={selectedTeam.hackathonName} busy={deleting} error={deleteError} onCancel={() => setSelectedTeam(null)} onConfirm={remove} />}
    </section>
  )
}
