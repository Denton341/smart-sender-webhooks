import { useForm } from 'react-hook-form'
import { useLocation, useNavigate, useParams } from 'react-router'
import { isApiError } from '../../api/errors'
import type { Webhook, WebhookInput } from '../../api/schemas'
import { Dialog } from '../../shared/Dialog'
import { showSubmitError } from '../../shared/form-errors'
import { ErrorState, Spinner, TextField } from '../../shared/ui'
import { useUpdateWebhook, useWebhook } from './queries'

/** Route /webhooks/:id — a modal over the list, which keeps its page and search. */
export function EditWebhookDialog() {
  const params = useParams()
  const navigate = useNavigate()
  const { search } = useLocation()
  const id = parseId(params.id)
  const close = () => navigate({ pathname: '/webhooks', search })

  return (
    <Dialog title="Edit webhook" onClose={close}>
      {id === null ? <NotFound onClose={close} /> : <EditWebhook id={id} onDone={close} />}
    </Dialog>
  )
}

function EditWebhook({ id, onDone }: { id: number; onDone: () => void }) {
  const webhook = useWebhook(id)

  if (webhook.isPending) return <Spinner label="Loading webhook…" />
  if (isApiError(webhook.error, 404)) return <NotFound onClose={onDone} />
  if (webhook.isError) return <ErrorState error={webhook.error} onRetry={() => void webhook.refetch()} />
  return <WebhookForm webhook={webhook.data} onSaved={onDone} onCancel={onDone} />
}

interface WebhookFormProps {
  webhook: Webhook
  onSaved: () => void
  onCancel: () => void
}

function WebhookForm({ webhook, onSaved, onCancel }: WebhookFormProps) {
  const update = useUpdateWebhook(webhook.id)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<WebhookInput>({ defaultValues: { name: webhook.name, url: webhook.url } })

  // Validation is the server's job here; its 422 messages land next to the fields.
  const onSubmit = handleSubmit(async (input) => {
    try {
      await update.mutateAsync(input)
      onSaved()
    } catch (error) {
      showSubmitError(error, setError, ['name', 'url'])
    }
  })

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      {errors.root?.server && (
        <p className="notice notice--error" role="alert">
          {errors.root.server.message}
        </p>
      )}
      <TextField label="Name" autoComplete="off" error={errors.name?.message} {...register('name')} />
      <TextField label="URL" type="url" autoComplete="off" error={errors.url?.message} {...register('url')} />
      <div className="form__actions">
        <button type="button" className="button button--ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}

function NotFound({ onClose }: { onClose: () => void }) {
  return (
    <div className="notice">
      <p>This webhook does not exist.</p>
      <button type="button" className="button button--ghost" onClick={onClose}>
        Back to the list
      </button>
    </div>
  )
}

function parseId(raw: string | undefined): number | null {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}
