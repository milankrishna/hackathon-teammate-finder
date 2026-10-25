export function authDestination(state) {
  const from = state?.from
  // Only allow known local destinations, never an arbitrary redirect URL.
  if (typeof from === 'string' && !from.includes('#')) {
    const pathname = from.split('?')[0]
    if (['/dashboard', '/my-teams', '/my-requests', '/teams', '/teams/new', '/admin'].includes(pathname) ||
        /^\/teams\/[a-f\d]{24}(?:\/(?:edit|manage))?$/i.test(pathname)) return from
  }
  return '/dashboard'
}
