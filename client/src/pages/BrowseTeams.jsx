import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import useApiResource from '../hooks/useApiResource'
import PageState from '../components/PageState'
import TeamCard from '../components/TeamCard'

function positiveInteger(value, fallback) {
  return /^[1-9]\d*$/.test(value || '') && Number.isSafeInteger(Number(value)) ? Number(value) : fallback
}

function TeamFilters({ search, skill, onApply, onClear }) {
  function submit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onApply(form.get('search').trim(), form.get('skill').trim())
  }
  return (
    <form className="panel team-filters" onSubmit={submit} aria-label="Filter teams">
      <div className="field"><label htmlFor="team-search">Search teams</label><input id="team-search" name="search" type="search" defaultValue={search} placeholder="Hackathon name or description" /></div>
      <div className="field"><label htmlFor="team-skill">Skill needed</label><input id="team-skill" name="skill" defaultValue={skill} placeholder="For example, React" aria-describedby="team-skill-hint" /><span id="team-skill-hint" className="field-hint">Matches a complete skill, ignoring case.</span></div>
      <div className="filter-actions"><button className="button" type="submit">Find teams</button><button className="button button-secondary" type="button" onClick={onClear}>Clear filters</button></div>
    </form>
  )
}

export default function BrowseTeams() {
  const [params, setParams] = useSearchParams()
  const [filterReset, setFilterReset] = useState(0)
  const search = params.get('search') || ''
  const skill = params.get('skill') || ''
  const limit = Math.min(positiveInteger(params.get('limit'), 10), 50)
  const requestedPage = positiveInteger(params.get('page'), 1)
  const page = Number.isSafeInteger((requestedPage - 1) * limit) ? requestedPage : 1
  const query = new URLSearchParams({ search, skill, page: String(page), limit: String(limit) }).toString()
  const { data, error, loading, reload } = useApiResource(`/teams?${query}`)

  function clearFilters() {
    setParams({})
    setFilterReset((previous) => previous + 1)
  }

  function applyFilters(nextSearch, nextSkill) {
    const next = new URLSearchParams()
    if (nextSearch) next.set('search', nextSearch)
    if (nextSkill) next.set('skill', nextSkill)
    next.set('page', '1')
    if (limit !== 10) next.set('limit', String(limit))
    setParams(next)
  }

  function changePage(nextPage) {
    const next = new URLSearchParams(params)
    next.set('page', String(nextPage))
    setParams(next)
  }

  return (
    <section>
      <div className="page-heading"><span className="eyebrow">FIND YOUR PEOPLE</span><h1>Big ideas need great teams.</h1><p>Explore hackathons, find the skills that fit, and meet your next collaborators.</p></div>
      <TeamFilters key={`${params.toString()}:${filterReset}`} search={search} skill={skill} onApply={applyFilters} onClear={clearFilters} />
      {loading ? <PageState title="Finding teams" headingAs="h2" loading>Loading the latest hackathon teams…</PageState> : error ? (
        <PageState title="We couldn’t load teams" headingAs="h2" error actions={<button className="button" onClick={reload}>Try again</button>}>{error.message}</PageState>
      ) : (
        <>
          <div className="results-heading" role="status"><h2>Explore teams</h2><span className="muted">{data.total} {data.total === 1 ? 'team' : 'teams'} found</span></div>
          {data.teams.length ? <div className="teams-grid">{data.teams.map((team) => <TeamCard key={team._id} team={team} browseQuery={params.toString()} />)}</div> : (
            <PageState title={data.total ? 'No teams on this page' : 'No teams found'} headingAs="h2" actions={data.total ? <button className="button" onClick={() => changePage(1)}>Go to first page</button> : <button className="button button-secondary" onClick={clearFilters}>Reset search</button>}>
              {data.total ? 'Try an earlier page to see matching teams.' : search || skill ? 'Try a broader search or clear your skill filter to discover more teams.' : 'There are no teams to explore yet. Check back soon.'}
            </PageState>
          )}
          {(data.totalPages > 1 || data.page > 1) && <nav className="pagination" aria-label="Team results pages"><button className="button button-secondary" disabled={data.page <= 1} onClick={() => changePage(data.page - 1)}>Previous</button><span aria-live="polite">Page {data.page} · {data.totalPages} {data.totalPages === 1 ? 'page' : 'pages'} available</span><button className="button button-secondary" disabled={data.page >= data.totalPages} onClick={() => changePage(data.page + 1)}>Next</button></nav>}
        </>
      )}
    </section>
  )
}
