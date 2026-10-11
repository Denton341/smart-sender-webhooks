import type { WebhookList } from '../../api/schemas'

interface PaginationProps {
  paging: WebhookList['paging']
  onPageChange: (page: number) => void
}

export function Pagination({ paging, onPageChange }: PaginationProps) {
  const { current, last } = paging.pages

  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="pagination__total">{paging.results.total} total</span>
      <button
        type="button"
        className="button button--ghost"
        disabled={current <= 1}
        onClick={() => onPageChange(current - 1)}
      >
        Previous
      </button>
      <span aria-current="page">
        Page {current} of {last}
      </span>
      <button
        type="button"
        className="button button--ghost"
        disabled={current >= last}
        onClick={() => onPageChange(current + 1)}
      >
        Next
      </button>
    </nav>
  )
}
