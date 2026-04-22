export function formatDisplayDate(dateObj: Date, fallback: string): string {
  try {
    return dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
  } catch {
    return fallback
  }
}

export function formatDateForInput(dateStr: string): string {
  if (!dateStr) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  try {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  } catch { /* empty */ }
  return ''
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}
