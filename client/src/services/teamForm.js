export function initialTeamFields(team) {
  return {
    hackathonName: team?.hackathonName || '',
    hackathonDate: team?.hackathonDate?.slice(0, 10) || '',
    description: team?.description || '',
    skillsNeeded: team?.skillsNeeded.join(', ') || '',
    maxTeamSize: String(team?.maxTeamSize ?? 4),
  }
}

export function validateTeamFields(fields, team) {
  const errors = {}
  const values = {
    hackathonName: fields.hackathonName.trim(),
    description: fields.description.trim(),
    skillsNeeded: fields.skillsNeeded.split(',').map((skill) => skill.trim()).filter(Boolean),
    maxTeamSize: Number(fields.maxTeamSize),
  }
  if (!values.hackathonName) errors.hackathonName = 'Enter a hackathon name.'
  if (!values.description) errors.description = 'Describe your team and what you want to build.'
  const original = initialTeamFields(team)
  const dateChanged = !team || fields.hackathonDate !== original.hackathonDate
  if (dateChanged) {
    const date = new Date(`${fields.hackathonDate}T00:00:00.000Z`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.hackathonDate) || !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== fields.hackathonDate || date.getTime() <= Date.now()) {
      errors.hackathonDate = 'Choose a valid future hackathon date.'
    } else {
      values.hackathonDate = date.toISOString()
    }
  }
  if (!fields.maxTeamSize.trim() || !Number.isSafeInteger(values.maxTeamSize) || values.maxTeamSize < 2) {
    errors.maxTeamSize = 'Maximum team size must be an integer of at least 2.'
  } else if (team && values.maxTeamSize < team.members.length) {
    errors.maxTeamSize = `This team already has ${team.members.length} members. Capacity cannot be lower.`
  }
  // PATCH only changed fields. An unchanged past date need not block other edits.
  if (team) {
    for (const field of ['hackathonName', 'description', 'skillsNeeded', 'maxTeamSize']) {
      if (JSON.stringify(values[field]) === JSON.stringify(team[field])) delete values[field]
    }
  }
  return { errors, values }
}
