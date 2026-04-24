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
  { key: 'watch', label: '61-90 วัน', tone: 'from-sky-500 to-cyan-500', icon: 'fa-bell', detail: 'ติดตาม' },
  { key: 'all', label: 'ทั้งหมด', tone: 'from-slate-700 to-slate-500', icon: 'fa-capsules', detail: 'ยังไม่หมดอายุ' },
]

export default function DashboardCards({ items, activeFilter, onFilter }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      {CARDS.map((card) => {
        const scoped = card.key === 'all' ? items : items.filter((i) => matchesDashboardFilter(i, card.key))
        const ring = activeFilter === card.key ? 'ring-4 ring-offset-2 ring-teal-100 scale-[1.01]' : 'hover:-translate-y-0.5'
        return (
          <div
            key={card.key}
            role="button"
            tabIndex={0}
            onClick={() => onFilter(card.key)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onFilter(card.key)}
            className={`gesture-scrollable w-full cursor-pointer rounded-xl bg-gradient-to-br ${card.tone} p-3 sm:p-4 text-left text-white shadow-md transition-all duration-200 ${ring}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/75 truncate">{card.label}</p>
                <div className="mt-2 flex items-end gap-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/65">รายการ</p>
                    <p className="text-2xl sm:text-3xl font-extrabold leading-none mt-0.5">{scoped.length}</p>
                  </div>
                  <div className="mb-0.5 h-6 w-px bg-white/20"></div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/65">ชนิด</p>
                    <p className="text-2xl sm:text-3xl font-extrabold leading-none mt-0.5">{countUniqueDrugs(scoped)}</p>
                  </div>
                </div>
                <p className="text-[10px] text-white/75 mt-2 truncate">{card.detail}</p>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <i className={`fa-solid ${card.icon} text-sm`}></i>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
