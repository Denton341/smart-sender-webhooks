import type { ZodType } from 'zod'
import { ApiError, toApiError } from './errors'

export type HttpMethod = 'GET' | 'POST' | 'PUT'

type Query = Record<string, string | number | undefined>

export interface RequestOptions {
  method?: HttpMethod
  query?: Query
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
  /**
   * Protected endpoint: on 401 the session is rotated and the request is
   * retried once. Auth endpoints pass `false`, which is also what keeps a
   * rotate from ever starting another rotate.
   */
  auth?: boolean
}

export interface HttpClient {
  /** Request whose JSON response is validated by `schema`. */
  request<T>(path: string, options: RequestOptions & { schema: ZodType<T> }): Promise<T>
  /** Request whose response body is not needed. */
  request(path: string, options?: RequestOptions): Promise<void>
  /** Fires when the session cannot be renewed; the app has to end the local session. */
  onSessionExpired(listener: () => void): () => void
}

export interface HttpClientConfig {
  baseUrl: string
  /** Renews the session (POST /auth/token/rotate). Rejects when it cannot. */
  refreshSession: () => Promise<void>
}

const CSRF_HEADER = 'X-CSRF-TOKEN'
const BASE_HEADERS = { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }

/**
 * The only place that knows about CSRF and session renewal. Callers see a
 * request either succeed or fail with an ApiError; the retries are invisible.
 */
export function createHttpClient({ baseUrl, refreshSession }: HttpClientConfig): HttpClient {
  const expiredListeners = new Set<() => void>()
  const notifySessionExpired = () => expiredListeners.forEach((listener) => listener())

  // CSRF: fetched before the first API request and again after a 419.
  // Concurrent callers share one in-flight GET /csrf.
  let csrfToken: string | null = null
  let csrfRequest: Promise<string> | null = null

  function getCsrfToken(): Promise<string> {
    if (csrfToken !== null) return Promise.resolve(csrfToken)
    csrfRequest ??= fetchCsrfToken().finally(() => {
      csrfRequest = null
    })
    return csrfRequest
  }

  async function fetchCsrfToken(): Promise<string> {
    const response = await fetch(buildUrl('/csrf'), { headers: BASE_HEADERS, credentials: 'include' })
    if (!response.ok) throw await toApiError(response)
    const token = response.headers.get(CSRF_HEADER)
    if (!token) throw new ApiError(response.status, 'TokenMismatchException', 'The CSRF token header is missing.')
    csrfToken = token
    return token
  }

  // Session renewal. Each request remembers the session generation it was sent
  // in. Every 401 from one generation shares a single rotate, including 401s
  // that arrive after that rotate has already settled: they reuse its outcome
  // instead of starting another one.
  let sessionGeneration = 0
  let rotation: { from: number; done: Promise<void> } | null = null

  function renewSession(sentInGeneration: number): Promise<void> {
    if (rotation !== null && rotation.from >= sentInGeneration) return rotation.done

    const done = refreshSession()
      .catch((error: unknown) => {
        notifySessionExpired()
        throw error
      })
      .finally(() => {
        sessionGeneration += 1
      })
    rotation = { from: sentInGeneration, done }
    return done
  }

  function request<T>(path: string, options: RequestOptions & { schema: ZodType<T> }): Promise<T>
  function request(path: string, options?: RequestOptions): Promise<void>
  async function request(path: string, options: RequestOptions & { schema?: ZodType } = {}): Promise<unknown> {
    const { auth = true } = options
    let csrfRetried = false
    let sessionRetried = false

    for (;;) {
      const csrf = await getCsrfToken()
      const generation = sessionGeneration
      const response = await send(path, options, csrf)

      if (response.ok) return options.schema?.parse(await response.json())

      if (response.status === 419 && !csrfRetried) {
        csrfRetried = true
        // Drop the stale token, unless a concurrent 419 has already replaced it.
        if (csrfToken === csrf) csrfToken = null
        continue
      }

      if (response.status === 401 && auth && !sessionRetried) {
        sessionRetried = true
        const unauthorized = await toApiError(response)
        await renewSession(generation).catch(() => {
          throw unauthorized
        })
        continue
      }

      // Still 401 right after a successful rotate: the session is gone.
      if (response.status === 401 && auth) notifySessionExpired()
      throw await toApiError(response)
    }
  }

  function send(path: string, options: RequestOptions, csrf: string): Promise<Response> {
    const { method = 'GET', query, body, signal } = options
    const headers: Record<string, string> = { ...BASE_HEADERS, ...options.headers }
    if (method !== 'GET') headers[CSRF_HEADER] = csrf
    if (body !== undefined) headers['Content-Type'] = 'application/json'

    return fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
      // The session lives in an HttpOnly cookie: the browser attaches it, this code never sees it.
      credentials: 'include',
    })
  }

  function buildUrl(path: string, query: Query = {}): string {
    const url = new URL(path, baseUrl)
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
    }
    return url.toString()
  }

  return {
    request,
    onSessionExpired(listener) {
      expiredListeners.add(listener)
      return () => {
        expiredListeners.delete(listener)
      }
    },
  }
}
