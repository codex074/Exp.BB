import { ReportItem } from '../../types'
import { ACTION_STYLES } from '../../constants'
import { getExpiryStyles, sanitizeSubDetails } from '../../utils/stockUtils'
import { formatDisplayDate } from '../../utils/dateUtils'

interface Props {
  item: ReportItem
  onClick: (item: ReportItem) => void
}

export default function ItemCard({ item, onClick }: Props) {
  const status = getExpiryStyles(item.diffDays)
  const dateStr = formatDisplayDate(item.expObj, item.expiryDate)
  const style = ACTION_STYLES[item.action] ?? ACTION_STYLES['Other']
  const lotNo = (item.lotNo || '').trim()
  const notes = item.notes?.trim()

  let actionLabel = style.label
  if (item.action === 'Transfer' && item.subDetails) {
    const clean = sanitizeSubDetails(item.subDetails)
    if (clean) actionLabel += ` → ${clean}`
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(item)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick(item)}
      className={`section-card gesture-scrollable group relative cursor-pointer overflow-hidden border-l-4 ${status.borderStatus} px-3 py-2 sm:px-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none fade-in`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Drug info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate text-sm font-bold text-slate-800 transition-colors group-hover:text-teal-700 leading-snug">
              {item.drugName}
            </h3>
            {lotNo && (
              <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                {lotNo}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-400 leading-snug">
            {item.strength || '-'}
            {notes && <span> · {notes}</span>}
          </p>
        </div>

        {/* Inline stats — horizontal on all sizes */}
        <div className="hidden sm:flex items-center gap-0 shrink-0 divide-x divide-slate-100 rounded-lg border border-slate-100 bg-slate-50 text-xs overflow-hidden">
          <div className="px-3 py-1.5">
            <span className="text-slate-500 font-medium">{item.remainingQty}</span>
            <span className="text-slate-400 ml-0.5">{item.unit}</span>
          </div>
          <div className={`px-3 py-1.5 font-semibold ${status.textExp}`}>
            {dateStr}
            <span className="ml-1 text-[10px] opacity-70">({item.diffDays}d)</span>
          </div>
          <div className={`px-3 py-1.5 inline-flex items-center gap-1 font-bold ${style.text}`}>
            <i className={`fa-solid ${style.icon} text-[10px]`}></i>
            <span>{actionLabel}</span>
          </div>
        </div>

        {/* Mobile: compact 3-part row below title */}
        <div className={`sm:hidden flex items-center gap-1 shrink-0 text-[10px]`}>
          <span className={`font-semibold ${status.textExp}`}>{item.diffDays}d</span>
          <span className="text-slate-300">·</span>
          <span className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 font-bold ${style.bg} ${style.text} ${style.border}`}>
            <i className={`fa-solid ${style.icon}`}></i>
          </span>
        </div>
      </div>

      {/* Mobile stat strip */}
      <div className="sm:hidden mt-1.5 flex items-center gap-2 text-[11px] text-slate-500">
        <span className="font-medium text-slate-700">{item.remainingQty} {item.unit}</span>
        <span className="text-slate-300">·</span>
        <span className={`font-semibold ${status.textExp}`}>{dateStr}</span>
        <span className="text-slate-300">·</span>
        <span className={`font-semibold ${style.text}`}>{style.label}</span>
      </div>
    </div>
  )
}
