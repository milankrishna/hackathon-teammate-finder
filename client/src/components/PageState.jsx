export default function PageState({ title, children, loading = false, error = false, actions, headingAs: Heading = 'h1' }) {
  return (
    <section className={`state-card panel${error ? ' state-error' : ''}`} aria-busy={loading}>
      {loading && <span className="spinner" aria-hidden="true" />}
      <div role={error ? 'alert' : 'status'}>
        <Heading>{title}</Heading>
        <div className="muted">{children}</div>
      </div>
      {actions && <div className="button-row">{actions}</div>}
    </section>
  )
}
