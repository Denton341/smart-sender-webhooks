import { useForm } from 'react-hook-form'
import { Navigate, useLocation } from 'react-router'
import type { Credentials } from '../api/schemas'
import { showSubmitError } from '../shared/form-errors'
import { Spinner, TextField } from '../shared/ui'
import { getReturnPath } from './return-path'
import { signIn } from './session'
import { useSession } from './session-store'

export function LoginPage() {
  const session = useSession()
  const location = useLocation()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Credentials>({ defaultValues: { email: '', password: '' } })

  // Wait for the startup session check, so it cannot undo a fresh sign-in.
  if (session.status === 'restoring') {
    return (
      <div className="page-center">
        <Spinner />
      </div>
    )
  }
  if (session.status === 'authenticated') {
    return <Navigate to={getReturnPath(location.state)} replace />
  }

  const onSubmit = handleSubmit(async (credentials) => {
    try {
      await signIn(credentials)
    } catch (error) {
      showSubmitError(error, setError, ['email', 'password'])
    }
  })

  return (
    <div className="page-center">
      <form className="card login" onSubmit={onSubmit} noValidate>
        <h1 className="login__title">Sign in</h1>
        {errors.root?.server && (
          <p className="notice notice--error" role="alert">
            {errors.root.server.message}
          </p>
        )}
        <TextField label="Email" type="email" autoComplete="username" error={errors.email?.message} {...register('email')} />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <button type="submit" className="button" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
