import type { Credentials } from '../api/schemas'
import { api } from '../app/api'
import { queryClient } from '../app/query-client'
import { sessionStore } from './session-store'

export async function signIn(credentials: Credentials): Promise<void> {
  // The device token exists only in this scope: it is traded for the cookie
  // session right away and never stored anywhere.
  const { device_session_token } = await api.auth.login(credentials)
  await api.auth.issue(device_session_token)
  const user = await api.me.get()
  sessionStore.set({ status: 'authenticated', user })
}

export async function signOut(): Promise<void> {
  try {
    await api.auth.revoke()
  } catch {
    // Best effort: the local session ends either way.
  } finally {
    endLocalSession()
  }
}

/** Forgets the user and every cached piece of their data. */
function endLocalSession(): void {
  queryClient.clear()
  sessionStore.set({ status: 'anonymous' })
}

/**
 * Runs once on startup. A real backend keeps the HttpOnly cookie across
 * reloads, so ask the server whether a session is still there. The in-memory
 * mock forgets it on reload, which ends in the login screen.
 */
export async function startSession(): Promise<void> {
  api.onSessionExpired(endLocalSession)
  try {
    const user = await api.me.get()
    sessionStore.set({ status: 'authenticated', user })
  } catch {
    endLocalSession()
  }
}
