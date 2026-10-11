import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { Spinner } from '../shared/ui'
import { toReturnState } from './return-path'
import { useSession } from './session-store'

/**
 * Gate for signed-in routes. It also handles a session that dies mid-use:
 * the user lands on the login page and comes back to the same URL after it.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const session = useSession()
  const location = useLocation()

  if (session.status === 'restoring') {
    return (
      <div className="page-center">
        <Spinner />
      </div>
    )
  }
  if (session.status === 'anonymous') {
    return <Navigate to="/login" replace state={toReturnState(location)} />
  }
  return children
}
