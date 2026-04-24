import { GroupedRow, ReportItem } from '../../types'
import { ACTION_STYLES } from '../../constants'
import { getExpiryStyles } from '../../utils/stockUtils'

interface Props {
  group: GroupedRow
  onItemClick: (item: ReportItem) => void
  onHistoryClick: (drugName: string) => void
}

export default function GroupedCard({ group, onItemClick, onHistoryClick }: Props) {
  const status = getExpiryStyles(group.nearestDiffDays)

  const lotChips = group.items.slice(0, 4).map((item) => {
    const style = ACTION_STYLES[item.action] ?? ACTION_STYLES['Other']
    const lotNo = (item.lotNo || '').trim()
    return (
      <button
        key={item.rowIndex}
        type="button"
        onClick={(e) => { e.stopPropagation(); onItemClick(item) }}
        className="gesture-scrollable inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-left transition-colors hover:border-teal-200 hover:bg-teal-50 focus-visible:outline-none"
      >
        <span className="text-[11px] font-bold text-slate-700">{item.qty} {item.unit || ''}</span>
        {lotNo && <span className="hidden sm:inline text-[10px] text-slate-400">· {lotNo}</span>}
        <span className="text-[10px] text-slate-400">{item.diffDays}d</span>
        <span className={`inline-flex items-center gap-0.5 rounded-md border px-1 py-0.5 text-[9px] font-bold ${style.bg} ${style.text} ${style.border}`}>
          <i className={`fa-solid ${style.icon}`}></i>
          <span className="hidden sm:inline ml-0.5">{style.label}</span>
        </span>
      </button>
    )
  })

  return (
    <div className={`section-card gesture-scrollable relative w-full overflow-hidden border-l-4 ${status.borderStatus} px-3 py-2.5 sm:px-4 sm:py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md fade-in`}>
      <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:gap-4">

        {/* Drug info + lot chips */}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-800 sm:text-base leading-snug">{group.drugName}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{group.strength || '-'}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {lotChips}
            {group.items.length > 4 && (
              <span className="inline-flex items-center rounded-lg border border-dashed border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-400">
                +{group.items.length - 4} ล็อต
              </span>
            )}
          </div>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-3 gap-1.5 xl:min-w-[460px] xl:max-w-[460px]">
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">ล็อตห้องยา</p>
            <p className="mt-0.5 text-sm font-bold text-slate-700 leading-tight">{group.inRoomLots}</p>
            <p className="text-[10px] text-slate-400">{group.remainingQty} {group.unit || ''}</p>
          </div>

          <div className={`rounded-lg border px-2.5 py-2 ${status.expBg} ${status.textExp}`}>
            <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">หมดอายุ</p>
            <p className="mt-0.5 text-xs font-bold leading-tight">{group.nearestExpiryDate}</p>
            <p className="text-[10px] opacity-75">อีก {group.nearestDiffDays}d</p>
          </div>

          <div className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-white px-2.5 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">การจัดการ</p>
            <p className="text-[10px] font-medium text-slate-600 leading-relaxed line-clamp-2">{group.actionsSummary}</p>
            <button
              type="button"
              onClick={() => onHistoryClick(group.drugName)}
              className="gesture-scrollable mt-auto inline-flex items-center gap-1 self-start rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 transition-colors hover:bg-amber-100"
            >
              <i className="fa-solid fa-clock-rotate-left"></i>
              <span className="hidden sm:inline">ประวัติ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
