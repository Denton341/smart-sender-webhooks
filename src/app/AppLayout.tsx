import { useState } from 'react'
import { Link, Outlet } from 'react-router'
import { signOut } from '../auth/session'
import { useCurrentUser } from '../auth/session-store'

export function AppLayout() {
  const user = useCurrentUser()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = () => {
    setSigningOut(true)
    // Once the session is gone <RequireAuth> redirects to the login page.
    void signOut()
  }

  return (
    <div className="app">
      <header className="app-header">
        <Link to="/webhooks" className="app-header__brand">
          Smart Sender
        </Link>
        <div className="app-header__user">
          <span title={user.email}>{user.name}</span>
          <button type="button" className="button button--ghost" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
