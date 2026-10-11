import { delay, http, HttpResponse } from 'msw'
import type { FieldErrors } from '../api/errors'
import { randomHex } from '../shared/random-hex'
import { seedWebhooks } from './seed'

export const MOCK_CREDENTIALS = { email: 'demo@smartsender.dev', password: 'password123' } as const

const MOCK_USER = {
  id: 1,
  email: MOCK_CREDENTIALS.email,
  first_name: 'Olena',
  last_name: 'Kovalenko',
  name: 'Olena Kovalenko',
}

export const MOCK_CSRF_TOKEN = 'c5f0d2a8e94b4f7a9d1e3b6c8a0f2e4d'
export const SESSION_TTL_MS = 30_000

const FINGERPRINT_PATTERN = /^[0-9a-f]{32}$/
const DEFAULT_LIMIT = 10
const MAX_LIMIT = 100

const ERRORS = {
  400: { type: 'BadRequestException', message: 'Bad request.' },
  401: { type: 'AuthenticationException', message: 'Unauthenticated.' },
  404: { type: 'NotFoundException', message: 'Not found.' },
  419: { type: 'TokenMismatchException', message: 'CSRF token mismatch.' },
  422: { type: 'ValidationException', message: 'The given data was invalid.' },
} as const

export function errorResponse(status: keyof typeof ERRORS, payload?: FieldErrors): Response {
  const { type, message } = ERRORS[status]
  return HttpResponse.json({ error: { type, message, ...(payload && { payload }) } }, { status })
}

/**
 * The fake backend. Each call starts from a clean in-memory state, which is
 * what a page reload gives the browser and what every test case gets.
 */
export function createHandlers(baseUrl: string) {
  const webhooks = seedWebhooks()
  /** device_session_token -> the fingerprint it was issued to. Single use. */
  const deviceTokens = new Map<string, string>()
  /** Plays the HttpOnly session cookie: it lives here, the client never sees it. */
  let session: { fingerprint: string; expiresAt: number } | null = null

  const url = (path: string) => `${baseUrl}${path}`
  const startSession = (fingerprint: string) => {
    session = { fingerprint, expiresAt: Date.now() + SESSION_TTL_MS }
  }

  /** Checks every route shares, in the order a middleware stack runs them. */
  function rejectRequest(request: Request, { auth = false } = {}): Response | null {
    if (request.headers.get('X-Requested-With') !== 'XMLHttpRequest') return errorResponse(400)
    if (request.method !== 'GET' && request.headers.get('X-CSRF-TOKEN') !== MOCK_CSRF_TOKEN) return errorResponse(419)
    if (auth && (session === null || session.expiresAt <= Date.now())) return errorResponse(401)
    return null
  }

  const findWebhook = (rawId: unknown) => webhooks.find((webhook) => String(webhook.id) === rawId)

  return [
    http.get(url('/csrf'), async ({ request }) => {
      await delay()
      return (
        rejectRequest(request) ?? new HttpResponse(null, { status: 204, headers: { 'X-CSRF-TOKEN': MOCK_CSRF_TOKEN } })
      )
    }),

    http.post(url('/auth/login'), async ({ request }) => {
      await delay()
      const rejected = rejectRequest(request)
      if (rejected) return rejected
      if (!request.headers.get('X-Captcha-Token')) {
        return errorResponse(422, { captcha: ['The captcha token is required.'] })
      }

      const body = await readBody(request)
      const email = text(body.email).trim()
      const password = text(body.password)
      const fingerprint = text(body.fingerprint)

      const errors: FieldErrors = {}
      if (!email) errors.email = ['The email field is required.']
      if (!password) errors.password = ['The password field is required.']
      if (!FINGERPRINT_PATTERN.test(fingerprint)) errors.fingerprint = ['The fingerprint must be 32 hex characters.']
      if (Object.keys(errors).length > 0) return errorResponse(422, errors)

      if (email.toLowerCase() !== MOCK_CREDENTIALS.email || password !== MOCK_CREDENTIALS.password) {
        return errorResponse(422, { password: ['These credentials do not match our records.'] })
      }

      const deviceSessionToken = randomHex(32)
      deviceTokens.set(deviceSessionToken, fingerprint)
      return HttpResponse.json({ device_session_token: deviceSessionToken })
    }),

    http.post(url('/auth/token/issue'), async ({ request }) => {
      await delay()
      const rejected = rejectRequest(request)
      if (rejected) return rejected

      const body = await readBody(request)
      const token = text(body.device_session_token)
      const fingerprint = text(body.fingerprint)
      if (deviceTokens.get(token) !== fingerprint) {
        return errorResponse(422, { device_session_token: ['The device session token is invalid.'] })
      }

      deviceTokens.delete(token)
      startSession(fingerprint)
      return new HttpResponse(null, { status: 200 })
    }),

    http.post(url('/auth/token/rotate'), async ({ request }) => {
      await delay()
      const rejected = rejectRequest(request)
      if (rejected) return rejected

      // Before /issue and after /revoke there is nothing to rotate.
      const body = await readBody(request)
      if (session === null || session.fingerprint !== text(body.fingerprint)) return errorResponse(400)

      startSession(session.fingerprint)
      return new HttpResponse(null, { status: 200 })
    }),

    http.post(url('/auth/token/revoke'), async ({ request }) => {
      await delay()
      const rejected = rejectRequest(request)
      if (rejected) return rejected

      session = null
      return new HttpResponse(null, { status: 204 })
    }),

    http.get(url('/v1/me'), async ({ request }) => {
      await delay()
      return rejectRequest(request, { auth: true }) ?? HttpResponse.json(MOCK_USER)
    }),

    http.get(url('/v1/webhooks'), async ({ request }) => {
      await delay()
      const rejected = rejectRequest(request, { auth: true })
      if (rejected) return rejected

      const params = new URL(request.url).searchParams
      const page = positiveInt(params.get('page'), 1)
      const limit = Math.min(positiveInt(params.get('limit'), DEFAULT_LIMIT), MAX_LIMIT)
      const search = (params.get('search') ?? '').trim().toLowerCase()

      const matches = search ? webhooks.filter((webhook) => webhook.name.toLowerCase().includes(search)) : webhooks
      return HttpResponse.json({
        data: matches.slice((page - 1) * limit, page * limit),
        paging: {
          pages: { current: page, last: Math.max(1, Math.ceil(matches.length / limit)) },
          results: { total: matches.length, limitation: limit },
        },
      })
    }),

    http.get(url('/v1/webhooks/:id'), async ({ request, params }) => {
      await delay()
      const rejected = rejectRequest(request, { auth: true })
      if (rejected) return rejected

      const webhook = findWebhook(params.id)
      return webhook ? HttpResponse.json(webhook) : errorResponse(404)
    }),

    http.put(url('/v1/webhooks/:id'), async ({ request, params }) => {
      await delay()
      const rejected = rejectRequest(request, { auth: true })
      if (rejected) return rejected

      const webhook = findWebhook(params.id)
      if (!webhook) return errorResponse(404)

      const body = await readBody(request)
      const name = text(body.name).trim()
      const webhookUrl = text(body.url).trim()

      const errors: FieldErrors = {}
      if (!name) errors.name = ['The name field is required.']
      else if (name.length > 255) errors.name = ['The name may not be greater than 255 characters.']
      if (!webhookUrl) errors.url = ['The url field is required.']
      else if (!isHttpUrl(webhookUrl)) errors.url = ['The url must be a valid URL.']
      if (Object.keys(errors).length > 0) return errorResponse(422, errors)

      Object.assign(webhook, { name, url: webhookUrl })
      return HttpResponse.json(webhook)
    }),
  ]
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => null)
  return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function positiveInt(raw: string | null, fallback: number): number {
  const value = Number(raw)
  return Number.isInteger(value) && value >= 1 ? value : fallback
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol, hostname } = new URL(value)
    return (protocol === 'http:' || protocol === 'https:') && hostname !== ''
  } catch {
    return false
  }
}
