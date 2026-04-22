import { SHEETS_URL } from '../../constants'

interface Props {
  tab: 'entry' | 'report'
  onTabChange: (tab: 'entry' | 'report') => void
}

export default function Header({ tab, onTabChange }: Props) {
  return (
    <header className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.20),_transparent_28%),linear-gradient(135deg,_#0f766e_0%,_#0d9488_45%,_#0369a1_100%)] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.08),transparent_30%,transparent_70%,rgba(255,255,255,0.08))]"></div>
      <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/12 shadow-lg shadow-slate-950/15 backdrop-blur">
              <img src="/icons/hoslogo.png" alt="โลโก้โรงพยาบาล" className="h-10 w-10 object-contain" />
            </div>
            <div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">ระบบจัดการยาใกล้หมดอายุ</h1>
              <p className="mt-1 text-sm font-medium text-white/78 sm:text-base">ห้องจ่ายยาผู้ป่วยนอก โรงพยาบาลอุตรดิตถ์</p>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[420px] xl:items-end">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              onClick={() => onTabChange('entry')}
              className={`tab-button ${tab === 'entry' ? 'active' : ''}`}
              aria-label="เปิดหน้าบันทึกรายการ"
            >
              <i className="fa-solid fa-square-plus"></i> เพิ่มรายการ
            </button>
            <button
              onClick={() => onTabChange('report')}
              className={`tab-button ${tab === 'report' ? 'active' : ''}`}
              aria-label="เปิดหน้าจัดการรายการ"
            >
              <i className="fa-solid fa-chart-column"></i> จัดการรายการ
            </button>
            <a
              href={SHEETS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="icon-button h-12 w-12 rounded-2xl border border-white/20 bg-white text-emerald-700 shadow-soft"
              aria-label="เปิด Google Sheets"
            >
              <svg className="h-6 w-6" viewBox="0 0 87.3 113.2" xmlns="http://www.w3.org/2000/svg">
                <path fill="#1D6F42" d="M5.9 0h53.2l28.2 28.2v79.1c0 3.2-2.6 5.9-5.9 5.9H5.9c-3.2 0-5.9-2.6-5.9-5.9V5.9C0 2.6 2.6 0 5.9 0z" />
                <path fill="#47C67F" d="M59.1 0v28.2h28.2L59.1 0z" />
                <path fill="#FFF" d="M19.1 23.5h36.4v9.1H19.1zM19.1 41.7h49.1v9.1H19.1zM19.1 59.8h49.1v9.1H19.1zM19.1 78h49.1v9.1H19.1z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}
