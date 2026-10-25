import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import api, { AUTH_FAILURE_EVENT, clearToken, readToken, saveToken } from '../src/services/api.js'
import { authDestination } from '../src/services/navigation.js'
import { initialTeamFields, validateTeamFields } from '../src/services/teamForm.js'

const originalAdapter = api.defaults.adapter
let originalStorage
let originalWindow

test.beforeEach(() => {
  originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const values = new Map()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  } })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: new EventTarget() })
})

test.afterEach(() => {
  api.defaults.adapter = originalAdapter
  for (const [key, descriptor] of [['localStorage', originalStorage], ['window', originalWindow]]) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
})

function unauthorized(config) {
  return Promise.reject({ config, response: { status: 401, data: { error: 'Unauthorized.' } } })
}

test('API token persistence, Bearer headers and logout clearing', async () => {
  assert.equal(api.defaults.baseURL, '/api')
  saveToken('synthetic-test-credential')
  api.defaults.adapter = async (config) => {
    assert.equal(config.headers.get('Authorization'), 'Bearer synthetic-test-credential')
    return { data: { user: { id: 'test-user' } }, status: 200, headers: {}, config }
  }
  assert.equal((await api.get('/auth/me')).data.user.id, 'test-user')
  clearToken()
  assert.equal(readToken(), null)
})

test('protected API 401 clears credentials once; failed login keeps existing credentials', async () => {
  let failures = 0
  window.addEventListener(AUTH_FAILURE_EVENT, () => { failures += 1 })
  saveToken('synthetic-test-credential')
  api.defaults.adapter = unauthorized
  await assert.rejects(api.post('/auth/login', { email: 'audit@example.invalid', password: 'synthetic' }), (error) => {
    assert.equal(error.status, 401)
    assert.equal(error.config, undefined)
    return true
  })
  assert.equal(failures, 0)
  assert.equal(readToken(), 'synthetic-test-credential')
  await assert.rejects(api.get('/auth/me'), (error) => error.status === 401)
  assert.equal(readToken(), null)
  assert.equal(failures, 1)
  await assert.rejects(api.get('/auth/me'), (error) => error.status === 401)
  assert.equal(failures, 1)
})

test('a stale unauthorized response cannot clear a newer session', async () => {
  let rejectOld
  let started
  const ready = new Promise((resolve) => { started = resolve })
  api.defaults.adapter = (config) => new Promise((resolve, reject) => {
    rejectOld = () => reject({ config, response: { status: 401, data: { error: 'Unauthorized.' } } })
    started()
  })
  saveToken('old-synthetic-credential')
  const pending = api.get('/auth/me')
  await ready
  saveToken('new-synthetic-credential')
  rejectOld()
  await assert.rejects(pending, (error) => error.status === 401)
  assert.equal(readToken(), 'new-synthetic-credential')
})

test('login return destinations stay within known application routes', () => {
  for (const from of ['/teams/new', '/admin', '/my-teams', '/my-requests', '/teams/012345678901234567890123/manage']) assert.equal(authDestination({ from }), from)
  for (const from of ['https://example.invalid', '//example.invalid', '/teams/../login', '/unknown']) assert.equal(authDestination({ from }), '/dashboard')
})

test('team form rejects invalid dates/capacity and sends only editable changes', () => {
  const team = { _id: '012345678901234567890123', hackathonName: 'Test Fixture', hackathonDate: '2032-02-29T00:00:00.000Z', description: 'Test description', skillsNeeded: ['React'], maxTeamSize: 4, members: ['one', 'two', 'three'] }
  const fields = initialTeamFields(team)
  assert.deepEqual(validateTeamFields(fields, team).values, {})
  assert.ok(validateTeamFields({ ...fields, hackathonDate: '2030-02-31' }, team).errors.hackathonDate)
  assert.ok(validateTeamFields({ ...fields, maxTeamSize: '2' }, team).errors.maxTeamSize)
  assert.ok(validateTeamFields({ ...fields, maxTeamSize: '2.5' }, team).errors.maxTeamSize)
  assert.deepEqual(validateTeamFields({ ...fields, description: ' Updated ', skillsNeeded: 'React, CSS, ' }, team).values, { description: 'Updated', skillsNeeded: ['React', 'CSS'] })
})

test('route configuration, read-only history, form labels and role navigation render correctly', async () => {
  const { createServer } = await import('vite')
  const React = await import('react')
  const { renderToStaticMarkup } = await import('react-dom/server')
  const { MemoryRouter, createRoutesFromElements, matchRoutes } = await import('react-router-dom')
  const vite = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), logLevel: 'silent', server: { middlewareMode: true } })
  try {
    const { default: App } = await vite.ssrLoadModule('/src/App.jsx')
    const routes = createRoutesFromElements(App().props.children)
    for (const pathname of ['/dashboard', '/teams/new', '/my-teams', '/my-requests', '/teams/012345678901234567890123/edit', '/teams/012345678901234567890123/manage', '/admin']) {
      assert.ok(matchRoutes(routes, pathname).some((match) => match.route.element?.type?.name === 'ProtectedRoute'))
    }
    assert.ok(matchRoutes(routes, '/admin').some((match) => match.route.element?.type?.name === 'AdminRoute'))
    for (const pathname of ['/', '/teams', '/teams/012345678901234567890123']) assert.ok(!matchRoutes(routes, pathname).some((match) => match.route.element?.type?.name === 'ProtectedRoute'))
    assert.equal(matchRoutes(routes, '/teams/new').at(-1).route.element.type.name, 'CreateTeam')
    assert.equal(matchRoutes(routes, '/unknown').at(-1).route.element.type.name, 'NotFound')
    const { AuthContext } = await vite.ssrLoadModule('/src/context/authContext.js')
    const { default: Layout } = await vite.ssrLoadModule('/src/components/Layout.jsx')
    const { default: AuthForm } = await vite.ssrLoadModule('/src/components/AuthForm.jsx')
    const render = (Component, user, props) => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(AuthContext.Provider, { value: { user, logout() {}, login() {}, register() {}, isRestoring: false } }, React.createElement(Component, props))))
    assert.ok(!render(Layout, { role: 'user' }).includes('href="/admin"'))
    assert.ok(render(Layout, { role: 'admin' }).includes('href="/admin"'))
    const form = render(AuthForm, null, { mode: 'register' })
    for (const field of ['name', 'email', 'password', 'skills']) assert.ok(form.includes(`for="${field}"`))
    const { default: RequestHistoryCard } = await vite.ssrLoadModule('/src/components/RequestHistoryCard.jsx')
    for (const status of ['pending', 'accepted', 'rejected']) {
      const markup = render(RequestHistoryCard, null, { request: { status, team: { _id: '012345678901234567890123', hackathonName: 'Test Fixture' }, createdAt: '2026-01-01T00:00:00.000Z', message: '' } })
      assert.ok(markup.includes(status[0].toUpperCase() + status.slice(1)))
      assert.ok(!markup.includes('<button'))
      assert.ok(markup.includes('/teams/012345678901234567890123'))
    }
  } finally {
    await vite.close()
  }
})
