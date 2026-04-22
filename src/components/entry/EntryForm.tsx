import { useState } from 'react'
import { Drug, ActionType } from '../../types'
import { callAPI } from '../../api/gasApi'
import { MySwal } from '../../utils/swal'
import { todayISO } from '../../utils/dateUtils'
import { OTHER_STOCK_OUT_TOKEN, TRANSFER_DESTINATIONS } from '../../constants'
import DrugSearch from './DrugSearch'
import ActionCards from './ActionCards'

interface Props {
  drugDatabase: Drug[]
  isDrugLoading: boolean
  onDrugRefresh: () => void
  onSuccess: () => void
  setOverlay: (v: boolean) => void
}

interface FormState {
  entryDate: string
  selectedDrug: Drug | null
  qty: number
  expiryDate: string
  lotNo: string
  action: ActionType | null
  transferDest: string
  note: string
  otherStockOut: boolean
}

const initForm = (): FormState => ({
  entryDate: todayISO(),
  selectedDrug: null,
  qty: 0,
  expiryDate: '',
  lotNo: '',
  action: null,
  transferDest: '',
  note: '',
  otherStockOut: false,
})

const NOTE_REQUIRED_ACTIONS: ActionType[] = ['Other', 'ContactWH', 'ReturnWH', 'Destroy']

export default function EntryForm({ drugDatabase, isDrugLoading, onDrugRefresh, onSuccess, setOverlay }: Props) {
  const [form, setForm] = useState<FormState>(initForm)
  const [key, setKey] = useState(0)

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))

  const handleActionChange = (action: ActionType) => {
    set({ action, transferDest: '', otherStockOut: false })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.selectedDrug) {
      MySwal.fire({ icon: 'warning', title: 'ยังไม่ได้เลือกยา', text: 'กรุณาเลือกยาจากรายการค้นหา' })
      return
    }
    if (!form.qty || form.qty <= 0) {
      MySwal.fire({ icon: 'warning', title: 'จำนวนไม่ถูกต้อง', text: 'จำนวนต้องมากกว่า 0' })
      return
    }
    if (!form.expiryDate) {
      MySwal.fire({ icon: 'warning', title: 'ยังไม่ได้เลือกวันหมดอายุ', text: 'กรุณาเลือกวันหมดอายุ' })
      return
    }
    if (!form.action) {
      MySwal.fire({ icon: 'warning', title: 'ยังไม่ได้เลือกวิธีจัดการ', text: 'กรุณาเลือกวิธีจัดการรายการ' })
      return
    }
    if (form.action === 'Transfer' && !form.transferDest) {
      MySwal.fire({ icon: 'warning', title: 'ยังไม่ได้เลือกปลายทาง', text: 'กรุณาเลือกปลายทางสำหรับการส่งต่อ' })
      return
    }
    if (NOTE_REQUIRED_ACTIONS.includes(form.action) && !form.note.trim()) {
      MySwal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกหมายเหตุ' })
      return
    }

    MySwal.fire({
      title: 'บันทึกรายการนี้หรือไม่?',
      text: 'กรุณาตรวจสอบข้อมูลให้เรียบร้อย',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันการบันทึก',
    }).then((result) => {
      if (result.isConfirmed) submitToServer()
    })
  }

  const submitToServer = async () => {
    if (!form.selectedDrug || !form.action) return
    let subDetails = ''
    if (form.action === 'Transfer') subDetails = form.transferDest
    else if (form.action === 'Other') subDetails = form.otherStockOut ? OTHER_STOCK_OUT_TOKEN : ''

    const payload = {
      entryDate: form.entryDate,
      drugName: form.selectedDrug.drugName,
      generic: form.selectedDrug.generic,
      strength: form.selectedDrug.strength,
      unit: form.selectedDrug.unit,
      lotNo: form.lotNo,
      qty: String(form.qty),
      expiryDate: form.expiryDate,
      actionType: form.action,
      subDetails,
      notes: form.note.trim(),
    }

    setOverlay(true)
    try {
      const res = await callAPI<{ success: boolean; message?: string }>('saveData', payload)
      setOverlay(false)
      if (res.success) {
        MySwal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1500, showConfirmButton: false })
        setForm(initForm())
        setKey((k) => k + 1)
        onSuccess()
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        MySwal.fire('ผิดพลาด', res.message ?? '', 'error')
      }
    } catch (err) {
      setOverlay(false)
      MySwal.fire({ title: 'เชื่อมต่อไม่สำเร็จ', text: String(err), icon: 'error' })
    }
  }

  const showDynamicArea = !!form.action
  const noteRequired = form.action ? NOTE_REQUIRED_ACTIONS.includes(form.action) : false

  return (
    <section className="fade-in">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
        <div className="space-y-6">
          <div className="section-card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-bold tracking-tight text-ink-900">เพิ่มข้อมูลยาใกล้หมดอายุใหม่</h2>
                <div className="rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
                  <div className="font-semibold">คำแนะนำ</div>
                  <div className="mt-1 text-brand-700/90">หากเพิ่งเปิดหน้าใหม่ ให้รีเฟรชรายการยาก่อนค้นหา</div>
                </div>
              </div>
            </div>

            <form key={key} onSubmit={handleSubmit} className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <label className="section-title">วันที่บันทึกรายการ</label>
                  <input
                    type="date"
                    value={form.entryDate}
                    onChange={(e) => set({ entryDate: e.target.value })}
                    className="field-shell"
                    required
                  />
                </div>

                <div className="relative space-y-2 xl:col-span-2">
                  <label className="section-title">ชื่อยา</label>
                  <DrugSearch
                    drugDatabase={drugDatabase}
                    isDrugLoading={isDrugLoading}
                    onDrugRefresh={onDrugRefresh}
                    onSelect={(d) => set({ selectedDrug: d })}
                    onClear={() => set({ selectedDrug: null })}
                    value={form.selectedDrug?.drugName ?? ''}
                  />
                </div>

                <div className="space-y-2">
                  <label className="section-title">วันหมดอายุ</label>
                  <input
                    type="date"
                    value={form.expiryDate}
                    min={todayISO()}
                    onChange={(e) => set({ expiryDate: e.target.value })}
                    className="field-shell border-rose-200 bg-rose-50/70 text-rose-700 shadow-none focus:border-rose-400 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.10)]"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="section-title">Lot No.</label>
                    <input
                      type="text"
                      value={form.lotNo}
                      onChange={(e) => set({ lotNo: e.target.value })}
                      className="field-shell"
                      placeholder="ระบุเลขล็อต (ถ้ามี)"
                      autoComplete="off"
                    />
                  </div>
                  <label className="section-title">จำนวน</label>
                  <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50/80 p-3">
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => set({ qty: Math.max(0, form.qty - 1) })} className="custom-btn" aria-label="ลดจำนวน">
                        <div className="custom-btn-front"><i className="fa-solid fa-minus"></i></div>
                      </button>
                      <input
                        type="number"
                        value={form.qty || ''}
                        onChange={(e) => set({ qty: Math.max(0, parseInt(e.target.value) || 0) })}
                        className="field-shell min-w-0 flex-1 border-0 bg-white text-center text-3xl font-bold shadow-none focus:shadow-[0_0_0_4px_rgba(20,184,166,0.12)]"
                        placeholder="0"
                        required
                      />
                      <button type="button" onClick={() => set({ qty: form.qty + 1 })} className="custom-btn" aria-label="เพิ่มจำนวน">
                        <div className="custom-btn-front"><i className="fa-solid fa-plus"></i></div>
                      </button>
                      <span className="inline-flex min-w-[74px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-bold uppercase tracking-[0.18em] text-ink-500">
                        {form.selectedDrug?.unit || 'หน่วย'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.4rem] border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#f0fdfa_100%)] p-4">
                  <p className="section-title">แนวทางใช้งาน</p>
                  <ul className="mt-3 space-y-3 text-sm text-ink-600">
                    <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand-500"></span><span>เลือกชื่อยาที่ตรงจากรายการค้นหาหลังรีเฟรชข้อมูล</span></li>
                    <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-sky-500"></span><span>ใช้การ์ด action ด้านล่างเพื่อคง workflow เดิมทั้งหมด</span></li>
                    <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-amber-500"></span><span>เพิ่มหมายเหตุเมื่อการส่งต่อหรือการตัด stock ต้องมีรายละเอียดประกอบ</span></li>
                  </ul>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <label className="section-title">วิธีจัดการ</label>
                    <p className="mt-1 text-sm text-ink-500">เลือกรูปแบบการจัดการล็อตนี้ แล้วระบบจะแสดงช่องที่จำเป็นให้อัตโนมัติ</p>
                  </div>
                  <span className="text-sm font-semibold text-rose-600">จำเป็น</span>
                </div>
                <ActionCards
                  selected={form.action}
                  onChange={handleActionChange}
                  name="actionType"
                  variant="entry"
                />
              </div>

              {showDynamicArea && (
                <div className="section-card border border-brand-100 bg-brand-50/35 p-5 fade-in">
                  <div className="mb-4">
                    <label className="section-title">รายละเอียดเพิ่มเติม</label>
                    <p className="mt-1 text-sm text-ink-500">ช่องเพิ่มเติมจะแสดงเฉพาะเมื่อ action ที่เลือกต้องใช้ข้อมูลเพิ่ม</p>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
                    {form.action === 'Transfer' && (
                      <select
                        value={form.transferDest}
                        onChange={(e) => set({ transferDest: e.target.value })}
                        className="select-shell"
                        required
                      >
                        <option value="" disabled>-- เลือกปลายทาง --</option>
                        {TRANSFER_DESTINATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    )}
                    <textarea
                      value={form.note}
                      onChange={(e) => set({ note: e.target.value })}
                      placeholder={noteRequired ? 'หมายเหตุ (จำเป็น)...' : 'หมายเหตุ (ไม่บังคับ)...'}
                      className={`text-shell ${noteRequired ? 'border-blue-300 ring-1 ring-blue-200' : ''}`}
                      rows={2}
                      required={noteRequired}
                    />
                  </div>
                  {form.action === 'Other' && (
                    <label className="mt-4 flex items-center gap-3 rounded-2xl border border-lime-200 bg-lime-50 px-4 py-3 text-sm font-semibold text-lime-800">
                      <input
                        type="checkbox"
                        checked={form.otherStockOut}
                        onChange={(e) => set({ otherStockOut: e.target.checked })}
                        className="h-5 w-5 rounded border-lime-300 text-lime-600 focus:ring-lime-400"
                      />
                      <span>ตัด stock ออกจากห้องแล้ว</span>
                    </label>
                  )}
                </div>
              )}

              <div className="flex border-t border-slate-100 pt-2 sm:justify-end">
                <button type="submit" className="btn-donate w-full justify-center text-base sm:w-auto sm:min-w-[220px]">
                  <i className="fa-solid fa-floppy-disk"></i> บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="section-card p-5">
            <p className="section-title">ลำดับการทำงาน</p>
            <h3 className="mt-2 text-lg font-bold text-ink-900">ขั้นตอนแนะนำในการบันทึก</h3>
            <div className="mt-4 space-y-3">
              {['รีเฟรชและค้นหาข้อมูลยา', 'ตรวจสอบวันหมดอายุและจำนวน', 'เลือกวิธีจัดการและกรอกรายละเอียดที่จำเป็น'].map((step, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-400">ขั้นตอน {i + 1}</p>
                  <p className="mt-1 text-sm font-semibold text-ink-800">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}
