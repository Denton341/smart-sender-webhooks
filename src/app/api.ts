import { createApi } from '../api/create-api'
import { getFingerprint } from '../auth/fingerprint'

/** The app-wide API client. The mock answers on the same origin. */
export const api = createApi({ baseUrl: window.location.origin, getFingerprint })
