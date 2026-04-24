import { FilterTime, SortMode } from '../../types'

interface Props {
  filterTime: FilterTime
  filterAction: string
  customNumber: string
  customUnit: 'days' | 'months'
  onFilterTimeChange: (v: FilterTime) => void
  onFilterActionChange: (v: string) => void
  onCustomNumberChange: (v: string) => void
  onCustomUnitChange: (v: 'days' | 'months') => void
  onRefresh: () => void
  isRefreshing: boolean
  sortMode: SortMode
  onSortChange: (v: SortMode) => void
  viewMode: 'items' | 'grouped'
  onViewModeChange: (v: 'items' | 'grouped') => void
  onExport: () => void
  insightText: string
  searchQuery: string
  onSearchChange: (v: string) => void
}

export default function FilterBar({
  filterTime, filterAction, customNumber, customUnit,
  onFilterTimeChange, onFilterActionChange, onCustomNumberChange, onCustomUnitChange,
  onRefresh, isRefreshing,
  sortMode, onSortChange, viewMode, onViewModeChange,
  onExport,
  insightText,
  searchQuery, onSearchChange,
}: Props) {
  return (
    <>
      <div className="section-card p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="section-title">ติดตามวันหมดอายุ</p>
            <h2 className="mt-1 truncate text-lg font-bold tracking-tight text-ink-900 sm:text-2xl">ตรวจสอบ จัดกลุ่ม และจัดการล็อตยา</h2>
          </div>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="secondary-button shrink-0 px-4 text-brand-700"
          >
            <i className={`fa-solid fa-arrows-rotate ${isRefreshing ? 'fa-spin' : ''}`}></i>
            <span className="hidden sm:inline">รีเฟรช</span>
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-400"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ค้นหาชื่อยา, สูตร, Lot No..."
              className="field-shell pl-10 pr-10"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-ink-400 hover:bg-slate-100 hover:text-ink-700"
                aria-label="ล้างการค้นหา"
              >
                <i className="fa-solid fa-xmark text-xs"></i>
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="section-title">ช่วงเวลา</label>
            <div className="relative">
              <select value={filterTime} onChange={(e) => onFilterTimeChange(e.target.value as FilterTime)} className="select-shell">
                <option value="all">ทั้งหมด</option>
                <option value="30">ภายใน 30 วัน</option>
                <option value="90">ภายใน 3 เดือน</option>
                <option value="180">ภายใน 6 เดือน</option>
                <option value="custom">กำหนดเอง...</option>
              </select>
              <i className="fa-solid fa-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-ink-400"></i>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="section-title">ประเภทการจัดการ</label>
            <div className="relative">
              <select value={filterAction} onChange={(e) => onFilterActionChange(e.target.value)} className="select-shell">
                <option value="all">ทุกประเภท</option>
                <option value="Sticker">ติด Sticker</option>
                <option value="Transfer">ส่งต่อห้องยา</option>
                <option value="Separate">แยกเก็บ</option>
                <option value="ContactWH">ติดต่อคลัง</option>
                <option value="ReturnWH">คืนคลัง</option>
                <option value="UsedUp">ใช้หมดแล้ว</option>
                <option value="Destroy">ทำลาย</option>
              </select>
              <i className="fa-solid fa-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-ink-400"></i>
            </div>
          </div>
        </div>
      </div>

      {filterTime === 'custom' && (
        <div className="section-card flex items-center gap-3 p-4 fade-in sm:flex-row">
          <input
            type="number"
            value={customNumber}
            onChange={(e) => onCustomNumberChange(e.target.value)}
            placeholder="จำนวน"
            className="field-shell text-center sm:max-w-[140px]"
          />
          <div className="relative flex-1 sm:max-w-[220px]">
            <select value={customUnit} onChange={(e) => onCustomUnitChange(e.target.value as 'days' | 'months')} className="select-shell">
              <option value="days">วัน</option>
              <option value="months">เดือน</option>
            </select>
            <i className="fa-solid fa-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-ink-400"></i>
          </div>
          <span className="text-sm font-semibold text-ink-500">นับจากวันนี้</span>
        </div>
      )}

      <div className="section-card p-4 sm:p-6">
        <p className="section-title mb-3">การแสดงผล</p>
        {/* Row 1: view toggle + sort */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex shrink-0 rounded-xl bg-slate-100 p-1">
            {(['items', 'grouped'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => onViewModeChange(mode)}
                className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-xs sm:px-3 sm:text-sm font-bold transition-all ${viewMode === mode ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
              >
                {mode === 'items' ? 'ล็อต' : 'จัดกลุ่ม'}
              </button>
            ))}
          </div>
          <div className="relative min-w-0 flex-1 sm:flex-none sm:w-[200px]">
            <select value={sortMode} onChange={(e) => onSortChange(e.target.value as SortMode)} className="select-shell text-sm">
              <option value="expiry">หมดอายุใกล้สุด</option>
              <option value="qty">จำนวนมากสุด</option>
              <option value="name">ชื่อยา</option>
            </select>
            <i className="fa-solid fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-400"></i>
          </div>
          <button onClick={onExport} className="soft-button shrink-0 justify-center border-emerald-200 bg-emerald-50 text-emerald-700 px-3 text-sm">
            <i className="fa-solid fa-file-export"></i>
            <span className="hidden sm:inline ml-1">ส่งออก CSV</span>
          </button>
        </div>

        <div className="mt-5 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4 text-sm text-ink-600">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <i className="fa-solid fa-sparkles"></i>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-ink-800">ข้อมูลสรุป</p>
              <p className="mt-1 leading-relaxed">{insightText || 'ข้อมูลสรุปเกี่ยวกับวันหมดอายุจะแสดงที่นี่'}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
