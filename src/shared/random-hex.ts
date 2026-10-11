/** Cryptographically random lowercase hex string of the given (even) length. */
export function randomHex(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length / 2))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
