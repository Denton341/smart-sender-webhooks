import type { Webhook } from '../api/schemas'

const TOPICS = ['Order', 'Payment', 'Subscriber', 'Campaign', 'Message', 'Invoice', 'Lead', 'Chat', 'Ticket']
const ACTIONS = ['created', 'updated', 'deleted']
const DAY_MS = 24 * 60 * 60 * 1000
const FIRST_CREATED_AT = Date.UTC(2026, 0, 5, 9, 30)

/** 27 webhooks in a stable id order. */
export function seedWebhooks(): Webhook[] {
  return TOPICS.flatMap((topic) => ACTIONS.map((action) => ({ topic, action }))).map(({ topic, action }, index) => ({
    id: index + 1,
    name: `${topic} ${action}`,
    url: `https://hooks.example.com/${topic.toLowerCase()}/${action}`,
    active: index % 4 !== 3,
    created_at: new Date(FIRST_CREATED_AT + index * DAY_MS).toISOString(),
  }))
}
