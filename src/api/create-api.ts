import { createHttpClient } from './http'
import {
  loginResponseSchema,
  meSchema,
  webhookListSchema,
  webhookSchema,
  type Credentials,
  type WebhookInput,
  type WebhookListQuery,
} from './schemas'

export const WEBHOOKS_PAGE_SIZE = 10

export interface ApiConfig {
  baseUrl: string
  getFingerprint: () => string
  /** Stand-in for a captcha widget: the mock accepts any non-empty token. */
  getCaptchaToken?: () => string
}

/** Typed endpoints of the contract. A factory, so tests get a fresh client per case. */
export function createApi({ baseUrl, getFingerprint, getCaptchaToken = () => 'captcha-stub' }: ApiConfig) {
  const http = createHttpClient({ baseUrl, refreshSession: () => auth.rotate() })

  const auth = {
    login: (credentials: Credentials) =>
      http.request('/auth/login', {
        method: 'POST',
        auth: false,
        headers: { 'X-Captcha-Token': getCaptchaToken() },
        body: { ...credentials, fingerprint: getFingerprint() },
        schema: loginResponseSchema,
      }),
    issue: (deviceSessionToken: string) =>
      http.request('/auth/token/issue', {
        method: 'POST',
        auth: false,
        body: { device_session_token: deviceSessionToken, fingerprint: getFingerprint() },
      }),
    rotate: () =>
      http.request('/auth/token/rotate', { method: 'POST', auth: false, body: { fingerprint: getFingerprint() } }),
    revoke: () =>
      http.request('/auth/token/revoke', { method: 'POST', auth: false, body: { fingerprint: getFingerprint() } }),
  }

  const me = {
    get: (signal?: AbortSignal) => http.request('/v1/me', { schema: meSchema, signal }),
  }

  const webhooks = {
    list: ({ page, search }: WebhookListQuery, signal?: AbortSignal) =>
      http.request('/v1/webhooks', {
        query: { page, limit: WEBHOOKS_PAGE_SIZE, search: search.trim() },
        schema: webhookListSchema,
        signal,
      }),
    get: (id: number, signal?: AbortSignal) => http.request(`/v1/webhooks/${id}`, { schema: webhookSchema, signal }),
    update: (id: number, input: WebhookInput) =>
      http.request(`/v1/webhooks/${id}`, { method: 'PUT', body: input, schema: webhookSchema }),
  }

  return { auth, me, webhooks, onSessionExpired: http.onSessionExpired }
}

export type Api = ReturnType<typeof createApi>
