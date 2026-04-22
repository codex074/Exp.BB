import { OTHER_STOCK_OUT_TOKEN, STOCK_EXCLUSION_ACTIONS, ACTION_STYLES } from '../constants'
import { ActionType, ReportItem, GroupedRow, DashboardFilter, RawReportItem } from '../types'

export function isStockExcludedAction(
  action: ActionType,
  item?: Pick<RawReportItem, 'subDetails'>,
): boolean {
  return (
    STOCK_EXCLUSION_ACTIONS.includes(action) ||
    (action === 'Other' && hasOtherStockOut(item?.subDetails))
  )
}

export function hasOtherStockOut(subDetails?: string): boolean {
  return String(subDetails || '').includes(OTHER_STOCK_OUT_TOKEN)
}

export function sanitizeSubDetails(subDetails?: string): string {
  return String(subDetails || '').replace(OTHER_STOCK_OUT_TOKEN, '').trim()
}

export function getDrugKey(
  item: Pick<RawReportItem, 'drugName' | 'strength' | 'unit'>,
): string {
  return `${item.drugName || ''}||${item.strength || ''}||${item.unit || ''}`
}

export function matchesDashboardFilter(item: ReportItem, filterKey: DashboardFilter): boolean {
  if (filterKey === 'urgent') return item.diffDays >= 0 && item.diffDays <= 30
  if (filterKey === 'soon') return item.diffDays >= 31 && item.diffDays <= 60
  if (filterKey === 'watch') return item.diffDays >= 61 && item.diffDays <= 90
  if (filterKey === 'later') return item.diffDays > 90
  return true
}

export function countUniqueDrugs(items: ReportItem[]): number {
  return new Set(items.map((i) => `${i.drugName}||${i.strength || ''}`)).size
}

type Sortable = {
  drugName?: string
  remainingQty?: number
  totalQty?: number
  qty?: string
  diffDays?: number
  nearestDiffDays?: number
}

export function applySort<T extends Sortable>(items: T[], sortMode: string): T[] {
  return [...items].sort((a, b) => {
    if (sortMode === 'name')
      return String(a.drugName || '').localeCompare(String(b.drugName || ''))
    if (sortMode === 'qty') {
      const bVal = b.remainingQty ?? b.totalQty ?? parseInt(b.qty ?? '0', 10) ?? 0
      const aVal = a.remainingQty ?? a.totalQty ?? parseInt(a.qty ?? '0', 10) ?? 0
      return (bVal as number) - (aVal as number)
    }
    return (a.nearestDiffDays ?? a.diffDays ?? 0) - (b.nearestDiffDays ?? b.diffDays ?? 0)
  })
}

export function buildGroupedRows(items: ReportItem[]): GroupedRow[] {
  const grouped: Record<string, GroupedRow> = {}
  items.forEach((item) => {
    const key = [item.drugName, item.strength, item.unit].join('||')
    if (!grouped[key]) {
      grouped[key] = {
        key,
        drugName: item.drugName,
        strength: item.strength,
        unit: item.unit,
        totalQty: 0,
        remainingQty: item.remainingQty || 0,
        nearestDiffDays: item.diffDays,
        nearestExpiryDate: item.expiryDate,
        items: [],
        actionMap: {},
        actionsSummary: '',
        inRoomLots: 0,
        recommendation: '',
      }
    }
    grouped[key].items.push(item)
    grouped[key].totalQty += parseInt(item.qty, 10) || 0
    if (!item.isStockExcluded) grouped[key].inRoomLots += 1
    grouped[key].actionMap[item.action] = (grouped[key].actionMap[item.action] || 0) + 1
    if (item.diffDays < grouped[key].nearestDiffDays) {
      grouped[key].nearestDiffDays = item.diffDays
      grouped[key].nearestExpiryDate = item.expiryDate
    }
  })

  return Object.values(grouped).map((group) => {
    group.items = applySort(group.items, 'expiry') as ReportItem[]
    group.actionsSummary = Object.entries(group.actionMap)
      .map(([action, count]) => `${ACTION_STYLES[action as ActionType]?.label ?? action}: ${count}`)
      .join(' • ')
    group.recommendation =
      group.nearestDiffDays <= 30
        ? 'ควรดำเนินการล็อตนี้ก่อน'
        : group.nearestDiffDays <= 60
        ? 'เตรียมแผนส่งต่อ / ติด Sticker'
        : 'ติดตามและตรวจสอบอย่างสม่ำเสมอ'
    return group
  })
}

export function getExpiryStyles(diffDays: number) {
  if (diffDays <= 30)
    return { borderStatus: 'border-l-red-500', textExp: 'text-red-600', expBg: 'bg-red-50 border-red-100' }
  if (diffDays <= 90)
    return { borderStatus: 'border-l-orange-400', textExp: 'text-orange-600', expBg: 'bg-orange-50 border-orange-100' }
  return { borderStatus: 'border-l-green-500', textExp: 'text-green-600', expBg: 'bg-green-50 border-green-100' }
}

export function processReportData(rawData: RawReportItem[]): ReportItem[] {
  const today = new Date()
  const base = rawData.map((item) => {
    const exp = new Date(item.expiryDate)
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return {
      ...item,
      diffDays,
      expObj: exp,
      stockKey: getDrugKey(item),
      isStockExcluded: isStockExcludedAction(item.action, item),
      remainingQty: 0,
    }
  })

  const remainingQtyMap = base.reduce<Record<string, number>>((acc, item) => {
    if (item.diffDays < 0 || item.isStockExcluded) return acc
    acc[item.stockKey] = (acc[item.stockKey] || 0) + (parseInt(item.qty, 10) || 0)
    return acc
  }, {})

  return base.map((item) => ({ ...item, remainingQty: remainingQtyMap[item.stockKey] || 0 }))
}
