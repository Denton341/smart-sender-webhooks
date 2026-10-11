import { useEffect, useId, useRef, type ReactNode } from 'react'

interface DialogProps {
  title: string
  /** Asks the owner to close; the dialog is open for as long as it is mounted. */
  onClose: () => void
  children: ReactNode
}

/** Native modal <dialog>: focus trap, Esc and the backdrop come from the browser. */
export function Dialog({ title, onClose, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Esc: leave closing to the owner, so the URL stays the source of truth.
        event.preventDefault()
        onClose()
      }}
    >
      <h2 id={titleId} className="dialog__title">
        {title}
      </h2>
      {children}
    </dialog>
  )
}
