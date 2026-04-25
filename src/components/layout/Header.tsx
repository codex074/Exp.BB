import hosLogoUrl from '/icons/hoslogo.png'

interface Props {
  tab: 'entry' | 'report' | 'drugs'
  onTabChange: (tab: 'entry' | 'report' | 'drugs') => void
  onDrugsTab: () => void
}

export default function Header({ tab, onTabChange, onDrugsTab }: Props) {
  return (
    <header className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.20),_transparent_28%),linear-gradient(135deg,_#0f766e_0%,_#0d9488_45%,_#0369a1_100%)] px-4 py-4 text-white sm:px-6 sm:py-5 lg:px-8">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.08),transparent_30%,transparent_70%,rgba(255,255,255,0.08))]"></div>
      <div className="relative z-10 flex flex-col gap-3 sm:gap-4 xl:flex-row xl:items-center xl:justify-between">

        {/* Logo + Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/12 shadow-lg shadow-slate-950/15 backdrop-blur sm:h-14 sm:w-14">
            <img src={hosLogoUrl} alt="โลโก้โรงพยาบาล" className="h-8 w-8 object-contain sm:h-10 sm:w-10" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-tight sm:text-3xl">ระบบจัดการยาใกล้หมดอายุ</h1>
            <p className="text-xs font-medium text-white/78 sm:text-base">ห้องจ่ายยาผู้ป่วยนอก โรงพยาบาลอุตรดิตถ์</p>
          </div>
        </div>

        {/* Tab Buttons — always in a row */}
        <div className="flex items-center gap-2 xl:min-w-[420px] xl:justify-end">
          <button
            onClick={() => onTabChange('entry')}
            className={`tab-button flex-1 sm:flex-none ${tab === 'entry' ? 'active' : ''}`}
            aria-label="เปิดหน้าบันทึกรายการ"
          >
            <i className="fa-solid fa-square-plus"></i>
            <span className="hidden sm:inline">เพิ่มรายการ</span>
            <span className="sm:hidden">บันทึก</span>
          </button>
          <button
            onClick={() => onTabChange('report')}
            className={`tab-button flex-1 sm:flex-none ${tab === 'report' ? 'active' : ''}`}
            aria-label="เปิดหน้าจัดการรายการ"
          >
            <i className="fa-solid fa-chart-column"></i>
            <span className="hidden sm:inline">จัดการรายการ</span>
            <span className="sm:hidden">รายการ</span>
          </button>
          <button
            onClick={onDrugsTab}
            className={`tab-button flex-1 sm:flex-none ${tab === 'drugs' ? 'active' : ''}`}
            aria-label="เปิดหน้าจัดการบัญชียา"
          >
            <i className="fa-solid fa-pills"></i>
            <span className="hidden sm:inline">บัญชียา</span>
            <span className="sm:hidden">ยา</span>
          </button>
        </div>
      </div>
    </header>
  )
}
