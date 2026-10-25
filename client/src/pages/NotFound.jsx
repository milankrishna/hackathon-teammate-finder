import { Link } from 'react-router-dom'
import PageState from '../components/PageState'

export default function NotFound() {
  return <PageState title="404 — A little off the map" actions={<Link className="button" to="/">Back to home</Link>}><p>We couldn’t find that page. Your next great idea is still out there.</p></PageState>
}
