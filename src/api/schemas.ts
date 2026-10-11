import { z } from 'zod'

// Responses are validated at the boundary, so the rest of the app can trust these types.

export const meSchema = z.object({
  id: z.number(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  name: z.string(),
})
export type Me = z.infer<typeof meSchema>

export const webhookSchema = z.object({
  id: z.number(),
  name: z.string(),
  url: z.string(),
  active: z.boolean(),
  created_at: z.string(),
})
export type Webhook = z.infer<typeof webhookSchema>

export const webhookListSchema = z.object({
  data: z.array(webhookSchema),
  paging: z.object({
    pages: z.object({ current: z.number(), last: z.number() }),
    results: z.object({ total: z.number(), limitation: z.number() }),
  }),
})
export type WebhookList = z.infer<typeof webhookListSchema>

export const loginResponseSchema = z.object({ device_session_token: z.string() })

export interface Credentials {
  email: string
  password: string
}

export interface WebhookInput {
  name: string
  url: string
}

export interface WebhookListQuery {
  page: number
  search: string
}
