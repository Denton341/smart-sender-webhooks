import { useEffect, useState } from 'react'

const DEBOUNCE_MS = 300

interface SearchFieldProps {
  /** The search currently in the URL. */
  value: string
  onCommit: (search: string) => void
}

/** Search input that writes to the URL once typing pauses. */
export function SearchField({ value, onCommit }: SearchFieldProps) {
  const [draft, setDraft] = useState(value)
  const [urlValue, setUrlValue] = useState(value)
  /** A commit sent to the router that has not shown up in `value` yet. */
  const [pending, setPending] = useState<string | null>(null)

  // The URL changed. Our own commit arriving must not touch the draft (the
  // user may have kept typing); anything else is back/forward, which wins.
  if (value !== urlValue) {
    setUrlValue(value)
    setPending(null)
    if (value !== pending) setDraft(value)
  }

  useEffect(() => {
    const next = draft.trim()
    if (next === value.trim() || next === pending) return
    const timer = setTimeout(() => {
      setPending(next)
      onCommit(next)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [draft, value, pending, onCommit])

  return (
    <input
      type="search"
      className="search"
      placeholder="Search by name"
      aria-label="Search webhooks by name"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
    />
  )
}
