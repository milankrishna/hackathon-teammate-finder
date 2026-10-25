import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { initialTeamFields, validateTeamFields } from '../services/teamForm'

export default function TeamForm({ team, onSubmit, onBusyChange, disabled = false }) {
  const [fields, setFields] = useState(() => initialTeamFields(team))
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [errorStatus, setErrorStatus] = useState(null)
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const busy = useRef(false)
  const feedback = useRef(null)
  const forbidden = errorStatus === 403 || errorStatus === 404

  function update(event) {
    const { name, value } = event.target
    setFields((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => ({ ...previous, [name]: undefined }))
    setError('')
    setNotice('')
    setErrorStatus(null)
  }

  async function submit(event) {
    event.preventDefault()
    if (busy.current || disabled || forbidden) return
    const { errors: validation, values } = validateTeamFields(fields, team)
    setErrors(validation)
    setError('')
    setNotice('')
    if (Object.keys(validation).length) {
      event.currentTarget.elements.namedItem(Object.keys(validation)[0])?.focus()
      return
    }
    if (team && !Object.keys(values).length) {
      setNotice('There are no changes to save.')
      return
    }
    busy.current = true
    setSubmitting(true)
    onBusyChange?.(true)
    try {
      await onSubmit(values)
    } catch (requestError) {
      setError(requestError.message)
      setErrorStatus(requestError.status)
      feedback.current?.focus()
    } finally {
      busy.current = false
      setSubmitting(false)
      onBusyChange?.(false)
    }
  }

  function errorAttributes(name) {
    return { 'aria-invalid': Boolean(errors[name]), 'aria-describedby': errors[name] ? `${name}-error` : `${name}-hint` }
  }

  return (
    <form className="panel team-form" onSubmit={submit} noValidate aria-busy={submitting}>
      <div ref={feedback} tabIndex={-1} className={error ? 'error-banner' : 'sr-only'} role="alert">{error}</div>
      {errorStatus === 409 && team && <p className="notice-banner">Team membership may have changed. Check the current capacity before trying again. <Link to={`/teams/${team._id}`}>View team details</Link></p>}
      {forbidden && <p className="notice-banner">{errorStatus === 403 ? 'Editing is no longer permitted for this account.' : 'This team is no longer available.'} <Link to="/my-teams">Back to My Teams</Link></p>}
      {notice && <p className="success-banner" role="status">{notice}</p>}
      <fieldset disabled={submitting || disabled || forbidden}>
        <div className="field"><label htmlFor="hackathonName">Hackathon name</label><input id="hackathonName" name="hackathonName" required value={fields.hackathonName} onChange={update} {...errorAttributes('hackathonName')} />{errors.hackathonName ? <span id="hackathonName-error" className="field-error">{errors.hackathonName}</span> : <span id="hackathonName-hint" className="field-hint">Give your team a clear hackathon name.</span>}</div>
        <div className="form-columns">
          <div className="field"><label htmlFor="hackathonDate">Hackathon date</label><input id="hackathonDate" name="hackathonDate" type="date" required value={fields.hackathonDate} onChange={update} {...errorAttributes('hackathonDate')} />{errors.hackathonDate ? <span id="hackathonDate-error" className="field-error">{errors.hackathonDate}</span> : <span id="hackathonDate-hint" className="field-hint">Choose a future date. Dates use the UTC calendar.</span>}</div>
          <div className="field"><label htmlFor="maxTeamSize">Maximum team size</label><input id="maxTeamSize" name="maxTeamSize" type="number" min={2} step={1} required value={fields.maxTeamSize} onChange={update} {...errorAttributes('maxTeamSize')} />{errors.maxTeamSize ? <span id="maxTeamSize-error" className="field-error">{errors.maxTeamSize}</span> : <span id="maxTeamSize-hint" className="field-hint">Includes you as the creator.{team ? ` Current members: ${team.members.length}.` : ' Minimum 2 members.'}</span>}</div>
        </div>
        <div className="field"><label htmlFor="description">Description</label><textarea id="description" name="description" rows={6} required value={fields.description} onChange={update} {...errorAttributes('description')} />{errors.description ? <span id="description-error" className="field-error">{errors.description}</span> : <span id="description-hint" className="field-hint">Share your idea, goals, and the collaborators you’re looking for.</span>}</div>
        <div className="field"><label htmlFor="skillsNeeded">Skills needed <span className="optional">(optional)</span></label><input id="skillsNeeded" name="skillsNeeded" value={fields.skillsNeeded} onChange={update} aria-describedby="skillsNeeded-hint" placeholder="React, design, Python" /><span id="skillsNeeded-hint" className="field-hint">Separate skills with commas.</span></div>
        <div className="button-row"><button className="button" type="submit">{submitting ? (team ? 'Saving changes…' : 'Creating team…') : (team ? 'Save changes' : 'Create Team')}</button><Link className="button button-secondary" to={team ? `/teams/${team._id}` : '/my-teams'} onClick={(event) => { if (busy.current) event.preventDefault() }} aria-disabled={submitting}>Cancel</Link></div>
      </fieldset>
      <span className="sr-only" role="status">{submitting ? 'Saving your team. Please wait.' : ''}</span>
    </form>
  )
}
