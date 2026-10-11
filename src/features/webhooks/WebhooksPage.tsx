import { Outlet } from 'react-router'
import { ErrorState, Spinner } from '../../shared/ui'
import { Pagination } from './Pagination'
import { useWebhookList } from './queries'
import { SearchField } from './SearchField'
import { useWebhookListParams } from './use-list-params'
import { WebhooksTable } from './WebhooksTable'

export function WebhooksPage() {
  const { search, setSearch } = useWebhookListParams()

  return (
    <>
      <div className="toolbar">
        <h1>Webhooks</h1>
        <SearchField value={search} onCommit={setSearch} />
      </div>
      <WebhookList />
      {/* The edit dialog (/webhooks/:id) renders over the list. */}
      <Outlet />
    </>
  )
}

function WebhookList() {
  const { page, search, setPage, setSearch } = useWebhookListParams()
  const list = useWebhookList({ page, search })

  if (list.isPending) return <Spinner label="Loading webhooks…" />
  if (list.isError) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />

  const { data: webhooks, paging } = list.data
  if (webhooks.length === 0) {
    if (paging.results.total > 0) {
      return (
        <EmptyState message={`There is no page ${page}.`} action="Go to the first page" onAction={() => setPage(1)} />
      )
    }
    if (search) {
      return (
        <EmptyState message={`No webhooks match “${search}”.`} action="Clear search" onAction={() => setSearch('')} />
      )
    }
    return <EmptyState message="No webhooks yet." />
  }

  return (
    <>
      <WebhooksTable webhooks={webhooks} stale={list.isPlaceholderData} />
      <Pagination paging={paging} onPageChange={setPage} />
    </>
  )
}

function EmptyState({ message, action, onAction }: { message: string; action?: string; onAction?: () => void }) {
  return (
    <div className="notice">
      <p>{message}</p>
      {action && onAction && (
        <button type="button" className="button button--ghost" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  )
}
