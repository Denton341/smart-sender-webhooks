import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import type { WebhookListQuery } from '../../api/schemas'

/**
 * Page and search live in the URL, so reload and back/forward restore them.
 * Every change pushes a history entry; defaults are left out of the URL.
 */
export function useWebhookListParams() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query: WebhookListQuery = {
    page: parsePage(searchParams.get('page')),
    search: searchParams.get('search') ?? '',
  }

  const setPage = useCallback(
    (page: number) =>
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        if (page > 1) next.set('page', String(page))
        else next.delete('page')
        return next
      }),
    [setSearchParams],
  )

  // A new search always starts from the first page.
  const setSearch = useCallback(
    (search: string) =>
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        if (search) next.set('search', search)
        else next.delete('search')
        next.delete('page')
        return next
      }),
    [setSearchParams],
  )

  return { ...query, setPage, setSearch }
}

function parsePage(raw: string | null): number {
  const page = Number(raw)
  return Number.isInteger(page) && page >= 1 ? page : 1
}
