import { ReportItem, GroupedRow } from '../types'

function csvEscape(value: unknown): string {
  const s = value === undefined || value === null ? '' : String(value)
  return `"${s.replace(/"/g, '""')}"`
}

export function exportCSV(rows: (ReportItem | GroupedRow)[], viewMode: string): void {
  if (!rows.length) return

  const data =
    viewMode === 'grouped'
      ? (rows as GroupedRow[]).map((r) => ({
          drugName: r.drugName,
          strength: r.strength,
          unit: r.unit,
          totalQty: r.totalQty,
          nearestExpiryDate: r.nearestExpiryDate,
          nearestDiffDays: r.nearestDiffDays,
          lots: r.items.length,
          actions: r.actionsSummary,
        }))
      : (rows as ReportItem[]).map((r) => ({
          drugName: r.drugName,
          strength: r.strength,
          lotNo: r.lotNo,
          qty: r.qty,
          unit: r.unit,
          expiryDate: r.expiryDate,
          diffDays: r.diffDays,
          action: r.action,
          subDetails: r.subDetails,
          notes: r.notes,
        }))

  const headers = Object.keys(data[0])
  const csv = [
    headers.join(','),
    ...data.map((row) => headers.map((h) => csvEscape((row as Record<string, unknown>)[h])).join(',')),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `รายงานยาใกล้หมดอายุ-${viewMode}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
