// Formats a DB auto-increment number into a human-readable, zero-padded code
// (e.g. formatSequenceCode('PT', 123) -> "PT-000123"). The underlying sequence
// is the actual uniqueness guarantee; this is a display/reference convenience.
export function formatSequenceCode(prefix: string, sequence: number, padLength = 6): string {
  return `${prefix}-${String(sequence).padStart(padLength, '0')}`;
}
