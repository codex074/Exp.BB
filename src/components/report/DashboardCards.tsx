import { ReportItem, DashboardFilter } from '../../types'
import { matchesDashboardFilter, countUniqueDrugs } from '../../utils/stockUtils'

interface Props {
  items: ReportItem[]
  activeFilter: DashboardFilter
  onFilter: (f: DashboardFilter) => void
}

const CARDS: { key: DashboardFilter; label: string; tone: string; icon: string; detail: string }[] = [
  { key: 'urgent', label: '0-30 วัน', tone: 'from-rose-500 to-red-500', icon: 'fa-triangle-exclamation', detail: 'เร่งด่วน' },
  { key: 'soon', label: '31-60 วัน', tone: 'from-amber-400 to-orange-400', icon: 'fa-hourglass-half', detail: 'เตรียมจัดการ' },
  { key: 'watch', label: '61-90 วัน', tone: 'from-sky-500 to-cyan-500', icon: 'fa-bell', detail: 'ติดตามต่อเนื่อง' },
  { key: 'all', label: 'ทั้งหมดที่ยังใช้งาน', tone: 'from-slate-700 to-slate-500', icon: 'fa-capsules', detail: 'ล็อตที่ยังไม่หมดอายุทั้งหมด' },
]

export default function DashboardCards({ items, activeFilter, onFilter }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 2xl:grid-cols-4">
      {CARDS.map((card) => {
        const scoped = card.key === 'all' ? items : items.filter((i) => matchesDashboardFilter(i, card.key))
        const ring = activeFilter === card.key ? 'ring-4 ring-offset-2 ring-teal-100 scale-[1.01]' : 'hover:-translate-y-1'
        return (
          <div
            key={card.key}
            role="button"
            tabIndex={0}
            onClick={() => onFilter(card.key)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onFilter(card.key)}
            className={`gesture-scrollable w-full cursor-pointer rounded-2xl bg-gradient-to-br ${card.tone} p-3 sm:p-5 text-left text-white shadow-lg shadow-slate-200/60 transition-all duration-300 ${ring}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/75">{card.label}</p>
                <div className="mt-2 grid grid-cols-2 gap-1.5 sm:gap-3">
                  <div className="rounded-xl sm:rounded-2xl bg-white/12 px-2 py-1.5 sm:px-3 sm:py-2">
                    <p className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-white/70">รายการ</p>
                    <p className="text-xl sm:text-3xl font-extrabold mt-0.5">{scoped.length}</p>
                  </div>
                  <div className="rounded-xl sm:rounded-2xl bg-white/12 px-2 py-1.5 sm:px-3 sm:py-2">
                    <p className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-white/70">ชนิดยา</p>
                    <p className="text-xl sm:text-3xl font-extrabold mt-0.5">{countUniqueDrugs(scoped)}</p>
                  </div>
                </div>
                <p className="text-[11px] sm:text-sm text-white/80 mt-2">{card.detail}</p>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                <i className={`fa-solid ${card.icon} text-base sm:text-xl`}></i>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
