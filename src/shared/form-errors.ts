import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { isApiError } from '../api/errors'

/** A message fit for the UI, whatever was thrown. */
export function errorMessage(error: unknown): string {
  if (isApiError(error)) return error.message
  if (error instanceof TypeError) return 'Cannot reach the server. Check your connection and try again.'
  return 'Something went wrong. Please try again.'
}

/**
 * Puts a failed submit into the form: 422 messages go next to the fields they
 * name, everything else (unknown fields, other statuses, network) becomes a
 * form-level error under `root.server`.
 */
export function showSubmitError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): void {
  if (!isApiError(error, 422)) {
    setError('root.server', { type: 'server', message: errorMessage(error) })
    return
  }

  const isFormField = (name: string): name is Path<T> => (fields as readonly string[]).includes(name)
  const unplaced: string[] = []
  let placed = 0
  for (const [name, messages] of Object.entries(error.fieldErrors)) {
    if (isFormField(name)) {
      setError(name, { type: 'server', message: messages.join(' ') }, { shouldFocus: placed === 0 })
      placed += 1
    } else {
      unplaced.push(...messages)
    }
  }
  if (placed === 0 || unplaced.length > 0) {
    setError('root.server', { type: 'server', message: unplaced.join(' ') || error.message })
  }
}
