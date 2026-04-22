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
  const noteText = item.notes?.trim() || 'ไม่มีหมายเหตุ'

  let actionLabel = `${style.label}`
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
      className={`section-card gesture-scrollable group relative w-full cursor-pointer overflow-hidden border-l-4 ${status.borderStatus} px-4 py-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none fade-in sm:px-5`}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:gap-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">รายละเอียดล็อต</p>
            {lotNo && (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">
                Lot No. <span className="ml-1.5 normal-case tracking-normal text-slate-700">{lotNo}</span>
              </span>
            )}
          </div>
          <h3 className="mt-2 truncate text-lg font-bold text-slate-800 transition-colors group-hover:text-teal-700 sm:text-xl">{item.drugName}</h3>
          <p className="mt-1 text-sm font-medium text-slate-500">{item.strength || '-'}</p>
          <p className="mt-3 break-words text-sm text-slate-600"><span className="font-semibold text-slate-500">หมายเหตุ:</span> {noteText}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[620px] xl:max-w-[620px]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">จำนวนคงเหลือ</p>
            <p className="mt-2 text-xl font-bold text-slate-800 sm:text-2xl">
              {item.remainingQty} <span className="text-sm font-semibold text-slate-500">{item.unit || ''}</span>
            </p>
          </div>
          <div className={`rounded-2xl border px-4 py-3 ${status.expBg} ${status.textExp}`}>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-75">วันหมดอายุ</p>
            <p className="mt-2 text-base font-bold sm:text-lg">{dateStr}</p>
            <p className="text-sm opacity-80">เหลืออีก {item.diffDays} วัน</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">การจัดการ</p>
            <div className={`mt-2 inline-flex items-center rounded-2xl border px-3 py-2 text-sm font-bold shadow-sm ${style.bg} ${style.text} ${style.border}`}>
              <i className={`fa-solid ${style.icon} mr-1`}></i> {actionLabel}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
