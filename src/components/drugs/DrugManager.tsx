import { useState, useEffect, useMemo } from 'react'
import { DrugRecord } from '../../types'
import { getDrugsWithIds, addDrug, updateDrug, deleteDrug } from '../../api/firestoreApi'
import { MySwal, Toast } from '../../utils/swal'

const ITEMS_PER_PAGE = 20

const emptyForm = () => ({ drugName: '', generic: '', strength: '', unit: '' })

export default function DrugManager() {
  const [drugs, setDrugs] = useState<DrugRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<DrugRecord | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [isSaving, setIsSaving] = useState(false)

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))

  const loadDrugs = async () => {
    setIsLoading(true)
    try {
      setDrugs(await getDrugsWithIds())
    } catch (err) {
      MySwal.fire({ icon: 'error', title: 'โหลดไม่สำเร็จ', text: String(err) })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadDrugs() }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return drugs
    return drugs.filter((d) =>
      [d.drugName, d.generic, d.strength, d.unit].some((f) => f?.toLowerCase().includes(q)),
    )
  }, [drugs, search])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const openAdd = () => {
    setEditTarget(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  const openEdit = (drug: DrugRecord) => {
    setEditTarget(drug)
    setForm({ drugName: drug.drugName, generic: drug.generic, strength: drug.strength, unit: drug.unit })
    setModalOpen(true)
  }

  const closeModal = () => setModalOpen(false)

  const handleSave = async () => {
    if (!form.drugName.trim() || !form.strength.trim() || !form.unit.trim()) {
      MySwal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกชื่อยา ความแรง และหน่วย' })
      return
    }
    setIsSaving(true)
    try {
      if (editTarget) {
        await updateDrug(editTarget.id, form)
        Toast.fire({ icon: 'success', title: 'แก้ไขสำเร็จ' })
      } else {
        await addDrug(form)
        Toast.fire({ icon: 'success', title: 'เพิ่มยาสำเร็จ' })
      }
      closeModal()
      loadDrugs()
    } catch (err) {
      MySwal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: String(err) })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = (drug: DrugRecord) => {
    MySwal.fire({
      title: 'ลบรายการยานี้หรือไม่?',
      html: `<p class="text-slate-600 font-semibold">${drug.drugName} ${drug.strength}</p><p class="text-slate-400 text-sm mt-1">การลบจะไม่สามารถย้อนกลับได้</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบเลย',
      cancelButtonText: 'ยกเลิก',
    }).then(async (result) => {
      if (!result.isConfirmed) return
      try {
        await deleteDrug(drug.id)
        Toast.fire({ icon: 'success', title: 'ลบสำเร็จ' })
        loadDrugs()
      } catch (err) {
        MySwal.fire({ icon: 'error', title: 'ลบไม่สำเร็จ', text: String(err) })
      }
    })
  }

  return (
    <section className="fade-in space-y-6">
      <div className="section-card overflow-hidden">

        {/* Header */}
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-ink-900">จัดการบัญชียา</h2>
              <p className="mt-1 text-sm text-ink-500">
                {drugs.length} รายการทั้งหมด
                {search && filtered.length !== drugs.length && ` · แสดง ${filtered.length} รายการ`}
              </p>
            </div>
            <button onClick={openAdd} className="btn-donate w-full justify-center sm:w-auto">
              <i className="fa-solid fa-plus"></i> เพิ่มยาใหม่
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="border-b border-slate-100 px-5 py-3 sm:px-6">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="ค้นหาชื่อยา ชื่อสามัญ ความแรง หน่วย..."
              className="field-shell pl-11"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setPage(1) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full text-ink-400 hover:bg-slate-100 hover:text-rose-500 transition"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>
        </div>

        {/* Column headers */}
        <div className="hidden border-b border-slate-100 bg-slate-50 px-5 py-2 sm:px-6 sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_120px_80px_88px] sm:gap-4">
          {['ชื่อยา', 'ชื่อสามัญ (Generic)', 'ความแรง', 'หน่วย', ''].map((h) => (
            <span key={h} className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">{h}</span>
          ))}
        </div>

        {/* List */}
        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="custom-loader" />
            </div>
          ) : paged.length === 0 ? (
            <div className="px-6 py-14 text-center text-slate-400">
              <i className="fa-solid fa-pills mb-3 block text-3xl" />
              <p className="font-semibold">{search ? 'ไม่พบยาที่ค้นหา' : 'ยังไม่มีรายการยา'}</p>
              {!search && <p className="mt-1 text-sm">กดปุ่ม "เพิ่มยาใหม่" หรือนำเข้าจาก Google Sheets ที่หน้าบันทึก</p>}
            </div>
          ) : (
            paged.map((drug) => (
              <div
                key={drug.id}
                className="group flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 sm:px-6 sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_120px_80px_88px] sm:gap-4"
              >
                {/* Mobile: stacked */}
                <div className="flex min-w-0 flex-1 items-center gap-3 sm:contents">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 sm:hidden">
                    <i className="fa-solid fa-pills text-sm" />
                  </div>
                  <div className="min-w-0 sm:contents">
                    <p className="truncate font-semibold text-ink-900 sm:self-center">{drug.drugName}</p>
                    <p className="truncate text-sm text-ink-500 sm:self-center">{drug.generic || <span className="text-slate-300">—</span>}</p>
                    <p className="truncate text-sm text-ink-700 sm:self-center">{drug.strength || <span className="text-slate-300">—</span>}</p>
                    <p className="truncate text-sm font-semibold uppercase tracking-wide text-brand-700 sm:self-center">{drug.unit || <span className="text-slate-300">—</span>}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => openEdit(drug)}
                    className="secondary-button px-3 py-2 text-sm text-brand-700"
                    aria-label="แก้ไข"
                  >
                    <i className="fa-solid fa-pen-to-square" />
                  </button>
                  <button
                    onClick={() => handleDelete(drug)}
                    className="secondary-button px-3 py-2 text-sm text-rose-600"
                    aria-label="ลบ"
                  >
                    <i className="fa-solid fa-trash" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 sm:px-6">
            <span className="text-sm text-ink-500">หน้า {page} / {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="secondary-button px-4 py-2 text-sm disabled:opacity-40"
              >
                <i className="fa-solid fa-chevron-left" />
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page === totalPages}
                className="secondary-button px-4 py-2 text-sm disabled:opacity-40"
              >
                <i className="fa-solid fa-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="modal-bg fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-lift">

            {/* Modal header */}
            <div className="bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_55%,#0369a1_100%)] px-6 py-5 text-white">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/70">
                    {editTarget ? 'แก้ไขข้อมูล' : 'เพิ่มใหม่'}
                  </p>
                  <h3 className="mt-0.5 text-xl font-bold">
                    {editTarget ? editTarget.drugName : 'เพิ่มยาใหม่'}
                  </h3>
                </div>
                <button
                  onClick={closeModal}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white/80 transition hover:bg-white hover:text-teal-700"
                  aria-label="ปิด"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="space-y-4 px-6 py-6">
              <div className="space-y-1.5">
                <label className="section-title">
                  ชื่อยา <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.drugName}
                  onChange={(e) => set({ drugName: e.target.value })}
                  className="field-shell"
                  placeholder="เช่น Amoxicillin"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="section-title">ชื่อสามัญ (Generic)</label>
                <input
                  type="text"
                  value={form.generic}
                  onChange={(e) => set({ generic: e.target.value })}
                  className="field-shell"
                  placeholder="เช่น Amoxicillin (ถ้ามี)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="section-title">
                    ความแรง <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.strength}
                    onChange={(e) => set({ strength: e.target.value })}
                    className="field-shell"
                    placeholder="เช่น 500mg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="section-title">
                    หน่วย <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.unit}
                    onChange={(e) => set({ unit: e.target.value })}
                    className="field-shell"
                    placeholder="เช่น TAB, CAP"
                  />
                </div>
              </div>

              <p className="text-xs text-ink-400">
                <span className="text-rose-500">*</span> จำเป็นต้องกรอก
              </p>
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
              <button onClick={closeModal} className="secondary-button flex-1 justify-center">
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn-donate flex-1 justify-center"
              >
                {isSaving
                  ? <i className="fa-solid fa-spinner fa-spin" />
                  : <i className="fa-solid fa-floppy-disk" />}
                {editTarget ? 'บันทึกการแก้ไข' : 'เพิ่มยา'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
