/** Format elapsed seconds as HH:MM:SS */
export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

/** Compute elapsed seconds from an ISO start_time string */
export function elapsedSeconds(startTime: string): number {
  // Ensure the string is treated as UTC if it has no timezone info
  const normalized = startTime.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(startTime)
    ? startTime
    : startTime + 'Z'
  return Math.max(0, Math.floor((Date.now() - new Date(normalized).getTime()) / 1000))
}
