import { Link, useLocation } from 'react-router'
import type { Webhook } from '../../api/schemas'

interface WebhooksTableProps {
  webhooks: Webhook[]
  /** The rows are the previous page while the next one loads. */
  stale: boolean
}

export function WebhooksTable({ webhooks, stale }: WebhooksTableProps) {
  // The edit dialog is a child route: carry page and search along so the list
  // behind it, and the URL after it closes, stay the same.
  const { search } = useLocation()

  return (
    <table className="table" aria-busy={stale}>
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col">URL</th>
          <th scope="col">Status</th>
          <th scope="col">
            <span className="visually-hidden">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {webhooks.map((webhook) => (
          <tr key={webhook.id}>
            <td>{webhook.name}</td>
            <td className="table__url">{webhook.url}</td>
            <td>
              <span className={webhook.active ? 'badge badge--on' : 'badge'}>
                {webhook.active ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td className="table__actions">
              <Link to={{ pathname: `/webhooks/${webhook.id}`, search }} aria-label={`Edit ${webhook.name}`}>
                Edit
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
