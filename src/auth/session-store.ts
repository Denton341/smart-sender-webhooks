import { useSyncExternalStore } from 'react'
import type { Me } from '../api/schemas'

/**
 * What the client knows about the session: only whether there is one and who
 * the user is. The session tokens themselves never reach JavaScript.
 */
export type Session =
  | { status: 'restoring' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: Me }

let session: Session = { status: 'restoring' }
const listeners = new Set<() => void>()

export const sessionStore = {
  get: (): Session => session,
  set(next: Session) {
    session = next
    listeners.forEach((listener) => listener())
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

export function useSession(): Session {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.get)
}

/** The signed-in user. Only valid below <RequireAuth>. */
export function useCurrentUser(): Me {
  const current = useSession()
  if (current.status !== 'authenticated') throw new Error('useCurrentUser() needs an authenticated session')
  return current.user
}
