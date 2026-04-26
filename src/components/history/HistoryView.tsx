import { useEffect, useMemo, useState } from 'react'
import { ActionLogEntry, ActionStyle, ActionType } from '../../types'
import { fetchAllActionLogs } from '../../api/firestoreApi'
import { ACTION_STYLES, ITEMS_PER_PAGE } from '../../constants'
import { MySwal, Toast } from '../../utils/swal'
import StateCard from '../common/StateCard'
import Pagination from '../report/Pagination'

const META_STYLES: Record<string, ActionStyle> = {
  Deleted: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'ลบรายการ', icon: 'fa-trash' },
  'Stock Correction': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', label: 'ปรับ Stock', icon: 'fa-scale-balanced' },
  'Fields Edited': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'แก้ไขข้อมูล', icon: 'fa-pen-to-square' },
}

const NEW_ENTRY_STYLE: ActionStyle = {
  bg: 'bg-violet-50',
  text: 'text-violet-700',
  border: 'border-violet-200',
  label: 'รายการใหม่',
  icon: 'fa-square-plus',
}

const FALLBACK_STYLE: ActionStyle = {
  bg: 'bg-slate-50',
  text: 'text-slate-700',
  border: 'border-slate-200',
  label: 'อื่นๆ',
  icon: 'fa-circle-info',
}

function getActionStyle(action: string): ActionStyle {
  if (!action) return FALLBACK_STYLE
  if (META_STYLES[action]) return META_STYLES[action]
  if (action.startsWith('New Entry')) {
    const inner = action.match(/\(([^)]+)\)/)?.[1] as ActionType | undefined
    const base = inner && ACTION_STYLES[inner] ? ACTION_STYLES[inner] : null
    return {
      ...NEW_ENTRY_STYLE,
      label: base ? `รายการใหม่ · ${base.label}` : NEW_ENTRY_STYLE.label,
      icon: base ? base.icon : NEW_ENTRY_STYLE.icon,
    }
  }
  const ac = ACTION_STYLES[action as ActionType]
  if (ac) return ac
  return { ...FALLBACK_STYLE, label: action }
}

const RANGE_PRESETS: { value: string; label: string; days: number | null }[] = [
  { value: '7', label: '7 วัน', days: 7 },
  { value: '30', label: '30 วัน', days: 30 },
  { value: '90', label: '90 วัน', days: 90 },
  { value: 'all', label: 'ทั้งหมด', days: null },
]

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
function endOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

export default function HistoryView() {
  const [logs, setLogs] = useState<ActionLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [rangePreset, setRangePreset] = useState('30')
  const [actionFilter, setActionFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [reachedLimit, setReachedLimit] = useState(false)

  const loadLogs = async (showToast = false) => {
    setIsLoading(true)
    try {
      const preset = RANGE_PRESETS.find((r) => r.value === rangePreset)
      const days = preset?.days ?? null
      const startDate = days ? startOfDay(new Date(Date.now() - days * 86400000)) : null
      const endDate = endOfDay(new Date())
      const limitCount = 500
      const data = await fetchAllActionLogs({ startDate, endDate, limitCount })
      setLogs(data)
      setReachedLimit(data.length >= limitCount)
      if (showToast) Toast.fire({ icon: 'success', title: 'อัปเดตประวัติแล้ว' })
    } catch (err) {
      MySwal.fire({ title: 'เชื่อมต่อไม่สำเร็จ', text: String(err), icon: 'error' })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadLogs()
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangePreset])

  const handleRefresh = () => {
    setIsRefreshing(true)
    loadLogs(true)
  }

  const actionOptions = useMemo(() => {
    const set = new Set<string>()
    logs.forEach((l) => l.action && set.add(l.action))
    return Array.from(set).sort()
  }, [logs])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return logs.filter((l) => {
      if (actionFilter !== 'all' && l.action !== actionFilter) return false
      if (!q) return true
      return [l.drugName, l.action, l.details].some((f) => f?.toLowerCase().includes(q))
    })
  }, [logs, actionFilter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const pageRows = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  return (
    <section className="fade-in space-y-6">
      <div className="section-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-title">ประวัติการทำรายการ</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink-900">บันทึกกิจกรรมทั้งหมด</h2>
            <p className="mt-1 text-sm text-ink-500">
              {isLoading ? 'กำลังโหลด...' : `${filtered.length} รายการ${reachedLimit ? ' (จำกัดที่ 500 รายการล่าสุด)' : ''}`}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="secondary-button justify-center text-brand-700 disabled:opacity-50"
          >
            <i className={`fa-solid fa-arrows-rotate ${isRefreshing ? 'fa-spin' : ''}`}></i>
            <span>รีเฟรช</span>
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-1.5">
            <label className="section-title">ช่วงเวลา</label>
            <div className="flex flex-wrap gap-1.5">
              {RANGE_PRESETS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRangePreset(r.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    rangePreset === r.value
                      ? 'border-brand-300 bg-brand-50 text-brand-700'
                      : 'border-slate-200 bg-white text-ink-500 hover:bg-slate-50'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="section-title">ประเภท Action</label>
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
              className="select-shell"
            >
              <option value="all">ทั้งหมด</option>
              {actionOptions.map((a) => (
                <option key={a} value={a}>{getActionStyle(a).label} ({a})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 sm:col-span-2 xl:col-span-1">
            <label className="section-title">ค้นหา</label>
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-400"></i>
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="ชื่อยา, action, รายละเอียด..."
                className="field-shell pl-11 pr-10"
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); setPage(1) }}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-400 transition hover:bg-slate-100 hover:text-rose-500"
                  aria-label="ล้างคำค้นหา"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-[300px] flex-col gap-3 pb-8">
        {isLoading ? (
          <div className="col-span-full flex min-h-[260px] items-center justify-center">
            <div className="section-card flex w-full max-w-xl flex-col items-center px-8 py-10 text-center">
              <div className="custom-loader"></div>
              <h3 className="mt-5 text-xl font-bold text-slate-800">กำลังโหลดประวัติ</h3>
              <p className="mt-2 text-sm text-slate-500">กำลังดึงข้อมูล actionLog จาก Firestore</p>
            </div>
          </div>
        ) : !logs.length ? (
          <StateCard
            icon="fa-clock-rotate-left"
            title="ยังไม่มีประวัติในช่วงนี้"
            description="ลองเปลี่ยนช่วงเวลาเพื่อดูบันทึกย้อนหลังเพิ่มเติม"
            tone="slate"
          />
        ) : !filtered.length ? (
          <StateCard
            icon="fa-filter"
            title="ไม่พบรายการที่ตรงกับตัวกรอง"
            description="ลองลบคำค้นหาหรือเปลี่ยนประเภท action"
            tone="amber"
          />
        ) : (
          pageRows.map((log) => {
            const style = getActionStyle(log.action)
            return (
              <div
                key={log.id}
                className={`section-card border-l-4 p-4 sm:p-5 ${style.border.replace('border-', 'border-l-')}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${style.bg} ${style.text} ${style.border}`}>
                        <i className={`fa-solid ${style.icon}`}></i>
                        {style.label}
                      </span>
                      {log.qty && (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-ink-600">
                          จำนวน {log.qty}
                        </span>
                      )}
                    </div>
                    <p className="break-words text-base font-bold text-ink-900">
                      {log.drugName || <span className="text-slate-400">ไม่ระบุชื่อยา</span>}
                    </p>
                    {log.details && (
                      <p className="break-words text-sm leading-relaxed text-ink-600">{log.details}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-xs text-ink-400 sm:text-right">
                    <i className="fa-solid fa-clock mr-1"></i>
                    {log.timestamp || '-'}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {!isLoading && filtered.length > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPrev={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          onNext={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
        />
      )}
    </section>
  )
}
