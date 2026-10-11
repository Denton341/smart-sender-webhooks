import { z } from 'zod'

export type FieldErrors = Record<string, string[]>

const errorBodySchema = z.object({
  error: z.object({
    type: z.string(),
    message: z.string(),
    payload: z.record(z.string(), z.array(z.string())).nullish(),
  }),
})

/** A non-2xx response, normalised from the API error envelope. */
export class ApiError extends Error {
  readonly status: number
  readonly type: string
  /** Per-field messages; only a 422 ValidationException carries them. */
  readonly fieldErrors: FieldErrors

  constructor(status: number, type: string, message: string, fieldErrors: FieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.type = type
    this.fieldErrors = fieldErrors
  }
}

export function isApiError(error: unknown, status?: number): error is ApiError {
  return error instanceof ApiError && (status === undefined || error.status === status)
}

export async function toApiError(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null)
  const parsed = errorBodySchema.safeParse(body)
  if (!parsed.success) {
    return new ApiError(response.status, 'UnknownError', `Request failed with status ${response.status}`)
  }
  const { type, message, payload } = parsed.data.error
  return new ApiError(response.status, type, message, payload ?? {})
}
