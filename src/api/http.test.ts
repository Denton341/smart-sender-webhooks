import { http } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHandlers, errorResponse, MOCK_CREDENTIALS, SESSION_TTL_MS } from '../mocks/handlers'
import { createApi, type Api } from './create-api'

const BASE_URL = 'http://api.test'
const FINGERPRINT = '0123456789abcdef0123456789abcdef'

const server = setupServer()

/** "<METHOD> <path> <status>" for every response the mock sent. */
let responses: string[] = []
server.events.on('response:mocked', ({ request, response }) => {
  responses.push(`${request.method} ${new URL(request.url).pathname} ${response.status}`)
})

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  // A fresh backend for every test.
  server.resetHandlers(...createHandlers(BASE_URL))
  // Fake only the clock: the mock's 30 s session reads Date.now(), MSW keeps real timers.
  vi.useFakeTimers({ toFake: ['Date'] })
})
afterEach(() => vi.useRealTimers())
afterAll(() => server.close())

async function signedInApi(): Promise<{ api: Api; onSessionExpired: () => void }> {
  const api = createApi({ baseUrl: BASE_URL, getFingerprint: () => FINGERPRINT })
  const onSessionExpired = vi.fn()
  api.onSessionExpired(onSessionExpired)

  const { device_session_token } = await api.auth.login(MOCK_CREDENTIALS)
  await api.auth.issue(device_session_token)
  responses = []
  return { api, onSessionExpired }
}

describe('session renewal', () => {
  it('shares one rotate between two parallel 401s and retries both', async () => {
    const { api, onSessionExpired } = await signedInApi()
    vi.setSystemTime(Date.now() + SESSION_TTL_MS + 1)

    const [me, list] = await Promise.all([api.me.get(), api.webhooks.list({ page: 1, search: '' })])

    expect(me.email).toBe(MOCK_CREDENTIALS.email)
    expect(list.data).toHaveLength(10)
    expect(responses.toSorted()).toEqual([
      'GET /v1/me 200',
      'GET /v1/me 401',
      'GET /v1/webhooks 200',
      'GET /v1/webhooks 401',
      'POST /auth/token/rotate 200',
    ])
    expect(onSessionExpired).not.toHaveBeenCalled()
  })

  it('ends the session once when the shared rotate fails', async () => {
    const { api, onSessionExpired } = await signedInApi()
    await api.auth.revoke() // the server forgets the session, so rotate answers 400
    responses = []

    const results = await Promise.allSettled([api.me.get(), api.webhooks.list({ page: 1, search: '' })])

    for (const result of results) {
      expect(result).toMatchObject({ status: 'rejected', reason: { status: 401 } })
    }
    expect(responses.toSorted()).toEqual(['GET /v1/me 401', 'GET /v1/webhooks 401', 'POST /auth/token/rotate 400'])
    expect(onSessionExpired).toHaveBeenCalledTimes(1)
  })

  it('ends the session when the retry after a successful rotate is 401 again', async () => {
    const { api, onSessionExpired } = await signedInApi()
    server.use(http.get(`${BASE_URL}/v1/me`, () => errorResponse(401)))

    await expect(api.me.get()).rejects.toMatchObject({ status: 401 })

    expect(responses).toEqual(['GET /v1/me 401', 'POST /auth/token/rotate 200', 'GET /v1/me 401'])
    expect(onSessionExpired).toHaveBeenCalledTimes(1)
  })
})

describe('CSRF', () => {
  it('re-fetches the token after a 419 and retries the request once', async () => {
    const { api } = await signedInApi()
    server.use(http.put(`${BASE_URL}/v1/webhooks/:id`, () => errorResponse(419), { once: true }))

    const updated = await api.webhooks.update(1, { name: 'Renamed', url: 'https://example.com/hook' })

    expect(updated.name).toBe('Renamed')
    expect(responses).toEqual(['PUT /v1/webhooks/1 419', 'GET /csrf 204', 'PUT /v1/webhooks/1 200'])
  })
})
