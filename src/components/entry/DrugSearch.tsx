import { useState, useRef, useEffect } from 'react'
import { Drug } from '../../types'

interface Props {
  drugDatabase: Drug[]
  isDrugLoading: boolean
  onDrugRefresh: () => void
  onSelect: (drug: Drug) => void
  onClear: () => void
  value: string
  disabled?: boolean
}

export default function DrugSearch({
  drugDatabase,
  isDrugLoading,
  onDrugRefresh,
  onSelect,
  onClear,
  value,
  disabled,
}: Props) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setQuery(value) }, [value])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const matches = query.trim()
    ? drugDatabase.filter((d) => d.displayName.toLowerCase().includes(query.toLowerCase())).slice(0, 10)
    : []

  const handleInput = (v: string) => {
    setQuery(v)
    setOpen(!!v.trim())
  }

  const handleSelect = (drug: Drug) => {
    setQuery(drug.drugName)
    setOpen(false)
    onSelect(drug)
  }

  const handleClear = () => {
    setQuery('')
    setOpen(false)
    onClear()
  }

  const placeholder = isDrugLoading
    ? 'กำลังโหลดฐานข้อมูลยา...'
    : drugDatabase.length === 0
    ? 'กดปุ่มรีเฟรชก่อนค้นหา...'
    : 'ค้นหายา...'

  return (
    <div className="relative flex gap-3">
      <div className="relative flex-1" ref={wrapRef}>
        <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-400"></i>
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => query.trim() && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled || isDrugLoading}
          autoComplete="off"
          required
          className="field-shell pl-11 pr-10 disabled:bg-slate-50 disabled:text-ink-400"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-400 transition hover:bg-slate-100 hover:text-rose-500"
            aria-label="ล้างคำค้นหายา"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}
        {open && matches.length > 0 && (
          <ul className="glass-panel absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl text-sm shadow-soft">
            {matches.map((drug) => (
              <li
                key={drug.drugName}
                onClick={() => handleSelect(drug)}
                className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-teal-50 last:border-0"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                  <i className="fa-solid fa-pills"></i>
                </span>
                <span className="min-w-0 flex-1 truncate">{drug.displayName}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="button"
        onClick={onDrugRefresh}
        disabled={isDrugLoading}
        className="icon-button h-14 w-14 rounded-2xl text-brand-700"
        title="โหลดข้อมูล"
        aria-label="รีเฟรชฐานข้อมูลยา"
      >
        <i className={`fa-solid fa-arrows-rotate text-lg ${isDrugLoading ? 'fa-spin' : ''}`}></i>
      </button>
    </div>
  )
}
