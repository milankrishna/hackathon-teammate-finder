import { useEffect, useRef } from 'react'

export default function DeleteTeamDialog({ teamName, busy, error, onCancel, onConfirm }) {
  const dialog = useRef(null)
  const cancelButton = useRef(null)

  useEffect(() => {
    const element = dialog.current
    const previousFocus = document.activeElement
    element.showModal()
    cancelButton.current.focus()
    return () => {
      element.close()
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [])

  return (
    <dialog ref={dialog} className="confirmation-dialog" aria-labelledby="delete-team-title" aria-describedby="delete-team-description" aria-busy={busy} onCancel={(event) => { event.preventDefault(); if (!busy) onCancel() }}>
      <h2 id="delete-team-title">Delete this team?</h2>
      <p id="delete-team-description">“{teamName}” and all its join requests will be permanently deleted.</p>
      {error && <p className="error-banner" role="alert">{error}</p>}
      <div className="button-row"><button ref={cancelButton} className="button button-secondary" type="button" disabled={busy} onClick={onCancel}>Keep team</button><button className="button button-danger" type="button" disabled={busy} onClick={onConfirm}>{busy ? 'Deleting…' : 'Delete Team'}</button></div>
      <span className="sr-only" role="status">{busy ? 'Deleting the team. Please wait.' : ''}</span>
    </dialog>
  )
}
