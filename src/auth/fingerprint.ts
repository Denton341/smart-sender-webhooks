import { randomHex } from '../shared/random-hex'

const STORAGE_KEY = 'smart-sender.device-fingerprint'
const FINGERPRINT_PATTERN = /^[0-9a-f]{32}$/

let fingerprint: string | null = null

/** Stable device id: 32 hex chars, generated once and kept in localStorage. */
export function getFingerprint(): string {
  fingerprint ??= readStored() ?? store(randomHex(32))
  return fingerprint
}

function readStored(): string | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value !== null && FINGERPRINT_PATTERN.test(value) ? value : null
  } catch {
    return null
  }
}

function store(value: string): string {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Storage is blocked (e.g. privacy mode): the id stays stable for this tab only.
  }
  return value
}
