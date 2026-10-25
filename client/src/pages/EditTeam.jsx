import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import useApiResource from '../hooks/useApiResource'
import TeamForm from '../components/TeamForm'
import DeleteTeamDialog from '../components/DeleteTeamDialog'
import PageState from '../components/PageState'
import api from '../services/api'
import { referenceId } from '../services/teamPresentation'

function EditTeamContent({ team }) {
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const busy = useRef(false)

  async function save(values) {
    const { data } = await api.patch(`/teams/${team._id}`, values)
    navigate(`/teams/${data.team._id}`, { replace: true, state: { notice: 'Team updated successfully.' } })
  }

  async function remove() {
    if (busy.current || saving) return
    busy.current = true
    setDeleting(true)
    setDeleteError('')
    try {
      await api.delete(`/teams/${team._id}`)
      navigate('/my-teams', { replace: true, state: { notice: 'Team and associated join requests deleted successfully.' } })
    } catch (error) {
      setDeleteError(error.message)
    } finally {
      busy.current = false
      setDeleting(false)
    }
  }

  return <><TeamForm team={team} onSubmit={save} onBusyChange={setSaving} disabled={deleting} /><section className="panel danger-zone" aria-labelledby="delete-heading"><div><h2 id="delete-heading">Delete team</h2><p>This permanently removes the team and its join requests.</p></div><button className="button button-danger" disabled={saving || deleting} onClick={() => { setDeleteError(''); setConfirming(true) }}>Delete Team</button></section>{confirming && <DeleteTeamDialog teamName={team.hackathonName} busy={deleting} error={deleteError} onCancel={() => setConfirming(false)} onConfirm={remove} />}</>
}

export default function EditTeam() {
  const { id } = useParams()
  const { user } = useAuth()
  const { data, loading, error, reload } = useApiResource(`/teams/${encodeURIComponent(id)}`, user.id)
  if (loading) return <PageState title="Loading team editor" loading>Getting your current team details…</PageState>
  if (error) return <PageState title={error.status === 404 ? 'Team not found' : 'Team editor unavailable'} error actions={<><button className="button" onClick={reload}>Try again</button><Link className="button button-secondary" to="/my-teams">My Teams</Link></>}>{error.message}</PageState>
  if (referenceId(data.team.creator) !== user.id) return <PageState title="Only the creator can edit this team" error actions={<Link className="button" to={`/teams/${data.team._id}`}>View team</Link>}>You can view this team, but you don’t have permission to edit or delete it.</PageState>
  return <section className="team-form-page"><Link className="back-link" to={`/teams/${data.team._id}`}>← Back to team</Link><div className="page-heading"><span className="eyebrow">KEEP YOUR TEAM UP TO DATE</span><h1>Edit team</h1><p>{data.team.hackathonName}</p></div><EditTeamContent key={`${data.team._id}:${user.id}`} team={data.team} /></section>
}
