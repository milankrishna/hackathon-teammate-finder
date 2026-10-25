import { Link } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import useApiResource from '../hooks/useApiResource'
import PageState from '../components/PageState'
import RequestHistoryCard from '../components/RequestHistoryCard'

export default function MyRequests() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useApiResource('/requests/mine', user.id)

  return (
    <section>
      <div className="management-heading"><div className="page-heading"><span className="eyebrow">YOUR NEXT COLLABORATIONS</span><h1>My Requests</h1><p>Follow the join requests you’ve sent and see the latest decisions from team creators.</p></div><button className="button button-secondary" disabled={loading} onClick={reload}>Refresh requests</button></div>
      {loading ? <PageState title="Loading your requests" headingAs="h2" loading>Checking your latest request statuses…</PageState> : error ? <PageState title="We couldn’t load your requests" headingAs="h2" error actions={<button className="button" onClick={reload}>Try again</button>}>{error.message}</PageState> : !data.requests.length ? <PageState title="Your next collaboration starts here" headingAs="h2" actions={<Link className="button" to="/teams">Browse Teams</Link>}>You haven’t sent any join requests yet. Explore teams and introduce yourself.</PageState> : <div className="request-list">{data.requests.map((request) => <RequestHistoryCard key={request._id} request={request} />)}</div>}
    </section>
  )
}
