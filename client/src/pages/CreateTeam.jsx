import { useNavigate } from 'react-router-dom'
import TeamForm from '../components/TeamForm'
import api from '../services/api'

export default function CreateTeam() {
  const navigate = useNavigate()
  async function create(values) {
    const { data } = await api.post('/teams', values)
    navigate(`/teams/${data.team._id}`, { replace: true, state: { notice: 'Team created successfully.' } })
  }
  return <section className="team-form-page"><div className="page-heading"><span className="eyebrow">BRING YOUR IDEA TO LIFE</span><h1>Create your team.</h1><p>Tell fellow builders what you’re working on and who you’d love to meet.</p></div><TeamForm onSubmit={create} /></section>
}
