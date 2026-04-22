export interface Drug {
  drugName: string
  generic: string
  strength: string
  unit: string
  displayName: string
}

export type ActionType =
  | 'Sticker'
  | 'Transfer'
  | 'Separate'
  | 'ContactWH'
  | 'ReturnWH'
  | 'UsedUp'
  | 'Destroy'
  | 'Other'

export interface RawReportItem {
  rowIndex: number
  drugName: string
  generic: string
  strength: string
  qty: string
  unit: string
  expiryDate: string
  action: ActionType
  subDetails: string
  notes: string
  lotNo: string
}

export interface ReportItem extends RawReportItem {
  diffDays: number
  expObj: Date
  stockKey: string
  isStockExcluded: boolean
  remainingQty: number
}

export interface GroupedRow {
  key: string
  drugName: string
  strength: string
  unit: string
  totalQty: number
  remainingQty: number
  nearestDiffDays: number
  nearestExpiryDate: string
  items: ReportItem[]
  actionMap: Record<string, number>
  actionsSummary: string
  inRoomLots: number
  recommendation: string
}

export interface EntryFormData {
  entryDate: string
  drugName: string
  generic: string
  strength: string
  unit: string
  lotNo: string
  qty: string
  expiryDate: string
  actionType: ActionType
  subDetails: string
  notes: string
}

export interface ActionHistoryEntry {
  timestamp: string
  action: string
  qty: string
  details: string
}

export interface ActionStyle {
  bg: string
  text: string
  border: string
  label: string
  icon: string
}

export type DashboardFilter = 'all' | 'urgent' | 'soon' | 'watch' | 'later'
export type ViewMode = 'items' | 'grouped'
export type SortMode = 'expiry' | 'qty' | 'name'
export type FilterTime = 'all' | '30' | '90' | '180' | 'custom'
