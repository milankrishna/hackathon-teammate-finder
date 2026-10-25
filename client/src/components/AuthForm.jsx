import { useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/authContext'

export default function AuthForm({ mode }) {
  const registering = mode === 'register'
  const location = useLocation()
  const { login, register } = useAuth()
  const [fields, setFields] = useState({ name: '', email: '', password: '', skills: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const busy = useRef(false)
  const feedback = useRef(null)

  function update(event) {
    const { name, value } = event.target
    setFields((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => ({ ...previous, [name]: undefined }))
    setError('')
  }

  async function submit(event) {
    event.preventDefault()
    if (busy.current) return
    const validation = {}
    if (registering && !fields.name.trim()) validation.name = 'Enter your name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) validation.email = 'Enter a valid email address.'
    if (!fields.password) validation.password = 'Enter your password.'
    else if (registering && fields.password.length < 8) validation.password = 'Use at least 8 characters.'
    else if (new TextEncoder().encode(fields.password).length > 72) validation.password = 'Use at most 72 UTF-8 bytes. Emoji and accented characters can use more than one byte.'
    setErrors(validation)
    setError('')
    if (Object.keys(validation).length) {
      event.currentTarget.elements.namedItem(Object.keys(validation)[0])?.focus()
      return
    }
    busy.current = true
    setSubmitting(true)
    try {
      const credentials = { email: fields.email.trim().toLowerCase(), password: fields.password }
      if (registering) {
        await register({ ...credentials, name: fields.name.trim(), skills: fields.skills.split(',').map((skill) => skill.trim()).filter(Boolean) })
      } else {
        await login(credentials)
      }
    } catch (requestError) {
      setError(requestError.message)
      feedback.current?.focus()
    } finally {
      busy.current = false
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-layout">
      <div className="auth-intro">
        <span className="eyebrow">BUILD SOMETHING TOGETHER</span>
        <h1>{registering ? 'Your next great team starts here.' : 'Welcome back, builder.'}</h1>
        <p>{registering ? 'Bring your curiosity, add your skills, and take the first step toward your next hackathon.' : 'Sign in to your workspace and get ready to connect with your next hackathon team.'}</p>
        <div className="intro-note"><span aria-hidden="true">✦</span> Different skills. Shared ambition.</div>
      </div>
      <div className="panel auth-card">
        <h2>{registering ? 'Create your account' : 'Log in to your account'}</h2>
        <p className="muted form-intro">{registering ? 'A few details, and you’re ready to go.' : 'Pick up where you left off.'}</p>
        <div ref={feedback} tabIndex={-1} className={error ? 'error-banner' : 'sr-only'} role="alert">{error}</div>
        <form onSubmit={submit} noValidate aria-busy={submitting}>
          <fieldset disabled={submitting}>
            {registering && (
              <div className="field">
                <label htmlFor="name">Name</label>
                <input id="name" name="name" autoComplete="name" required value={fields.name} onChange={update} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-error' : undefined} />
                {errors.name && <span id="name-error" className="field-error">{errors.name}</span>}
              </div>
            )}
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input id="email" name="email" type="email" autoComplete="email" required value={fields.email} onChange={update} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} />
              {errors.email && <span id="email-error" className="field-error">{errors.email}</span>}
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" autoComplete={registering ? 'new-password' : 'current-password'} required minLength={registering ? 8 : undefined} value={fields.password} onChange={update} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : registering ? 'password-hint' : undefined} />
              {errors.password ? <span id="password-error" className="field-error">{errors.password}</span> : registering && <span id="password-hint" className="field-hint">At least 8 characters, at most 72 UTF-8 bytes.</span>}
            </div>
            {registering && (
              <div className="field">
                <label htmlFor="skills">Skills <span className="optional">(optional)</span></label>
                <input id="skills" name="skills" value={fields.skills} onChange={update} placeholder="React, design, Python" aria-describedby="skills-hint" />
                <span id="skills-hint" className="field-hint">Separate your skills with commas. You can leave this blank.</span>
              </div>
            )}
            <button className="button button-full" type="submit" disabled={submitting}>
              {submitting ? (registering ? 'Creating account…' : 'Logging in…') : (registering ? 'Create account' : 'Login')}
            </button>
          </fieldset>
          <span className="sr-only" role="status">{submitting ? 'Please wait while your request is processed.' : ''}</span>
        </form>
        <p className="form-switch">{registering ? 'Already have an account?' : 'New to Team Finder?'}{' '}
          <Link to={registering ? '/login' : '/register'} state={location.state}>{registering ? 'Login' : 'Create an account'}</Link>
        </p>
      </div>
    </section>
  )
}
