const DEFAULT_PATH = '/webhooks'

/** Router state the login page reads to send the user back where they were. */
export interface ReturnState {
  from: string
}

export function toReturnState({ pathname, search }: { pathname: string; search: string }): ReturnState {
  return { from: pathname + search }
}

/** Location state is untyped (it survives reloads), so check it before use. */
export function getReturnPath(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state && typeof state.from === 'string') {
    // Only same-app paths: never let the state point the user anywhere else.
    if (state.from.startsWith('/') && !state.from.startsWith('//')) return state.from
  }
  return DEFAULT_PATH
}
