import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { WebhookInput, WebhookList, WebhookListQuery } from '../../api/schemas'
import { api } from '../../app/api'

export const webhookKeys = {
  all: ['webhooks'] as const,
  lists: () => [...webhookKeys.all, 'list'] as const,
  list: (query: WebhookListQuery) => [...webhookKeys.lists(), query] as const,
  detail: (id: number) => [...webhookKeys.all, 'detail', id] as const,
}

export function useWebhookList(query: WebhookListQuery) {
  return useQuery({
    queryKey: webhookKeys.list(query),
    queryFn: ({ signal }) => api.webhooks.list(query, signal),
    // Keep the current page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}

export function useWebhook(id: number) {
  return useQuery({
    queryKey: webhookKeys.detail(id),
    queryFn: ({ signal }) => api.webhooks.get(id, signal),
  })
}

export function useUpdateWebhook(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: WebhookInput) => api.webhooks.update(id, input),
    onSuccess: (webhook) => {
      queryClient.setQueryData(webhookKeys.detail(id), webhook)
      // Show the change in cached pages at once, then refetch them: a renamed
      // webhook may no longer match the current search.
      queryClient.setQueriesData<WebhookList>({ queryKey: webhookKeys.lists() }, (list) =>
        list ? { ...list, data: list.data.map((item) => (item.id === webhook.id ? webhook : item)) } : list,
      )
      void queryClient.invalidateQueries({ queryKey: webhookKeys.lists() })
    },
  })
}
