import { GroupedRow, ReportItem, ActionType } from '../../types'
import { ACTION_STYLES } from '../../constants'
import { getExpiryStyles } from '../../utils/stockUtils'

interface Props {
  group: GroupedRow
  onItemClick: (item: ReportItem) => void
  onHistoryClick: (drugName: string) => void
}

export default function GroupedCard({ group, onItemClick, onHistoryClick }: Props) {
  const status = getExpiryStyles(group.nearestDiffDays)

  const lotChips = group.items.slice(0, 6).map((item) => {
    const style = ACTION_STYLES[item.action] ?? ACTION_STYLES['Other']
    const lotNo = (item.lotNo || '').trim()
    return (
      <button
        key={item.rowIndex}
        type="button"
        onClick={(e) => { e.stopPropagation(); onItemClick(item) }}
        className="gesture-scrollable inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-left transition-colors hover:border-teal-200 hover:bg-teal-50 focus-visible:outline-none"
      >
        <span className="text-sm font-bold text-slate-700">{item.qty} {item.unit || ''}</span>
        {lotNo && <span className="text-[11px] font-semibold text-slate-400">Lot {lotNo}</span>}
        <span className="text-[11px] text-slate-400">{item.expiryDate} ({item.diffDays}d)</span>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${style.bg} ${style.text} ${style.border}`}>
          <i className={`fa-solid ${style.icon}`}></i> {style.label}
        </span>
      </button>
    )
  })

  return (
    <div className={`section-card gesture-scrollable relative w-full overflow-hidden border-l-4 ${status.borderStatus} px-4 py-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl fade-in sm:px-5`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:gap-5">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">มุมมองจัดกลุ่มยา</p>
          <h3 className="mt-1.5 text-lg font-bold text-slate-800 sm:text-xl">{group.drugName}</h3>
          <p className="mt-0.5 text-sm font-medium text-slate-500">{group.strength || '-'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {lotChips}
            {group.items.length > 6 && (
              <span className="inline-flex items-center rounded-xl border border-dashed border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-400">
                + อีก {group.items.length - 6} ล็อต
              </span>
            )}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[560px] xl:max-w-[560px]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">ล็อตในห้องยา</p>
            <p className="mt-2 text-xl font-bold text-slate-800">{group.inRoomLots} <span className="text-sm font-semibold text-slate-500">ล็อต</span></p>
            <p className="mt-0.5 text-xs text-slate-400">รวม {group.remainingQty} {group.unit || ''}</p>
          </div>
          <div className={`rounded-2xl border px-4 py-3 ${status.expBg} ${status.textExp}`}>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-75">หมดอายุใกล้ที่สุด</p>
            <p className="mt-2 text-base font-bold sm:text-lg">{group.nearestExpiryDate}</p>
            <p className="text-sm opacity-80">เหลืออีก {group.nearestDiffDays} วัน</p>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">การจัดการ</p>
            <p className="text-xs font-semibold leading-relaxed text-slate-600">{group.actionsSummary}</p>
            <button
              type="button"
              onClick={() => onHistoryClick(group.drugName)}
              className="gesture-scrollable mt-auto inline-flex items-center gap-1.5 self-start rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-100"
            >
              <i className="fa-solid fa-clock-rotate-left"></i> ประวัติ
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
