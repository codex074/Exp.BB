import { useState } from 'react'
import { ReportItem, ActionType, ActionHistoryEntry } from '../../types'
import { manageItem, editItemFields, updateStockQuantity, deleteItem, fetchActionHistory } from '../../api/firestoreApi'
import { MySwal, swalTheme } from '../../utils/swal'
import { sanitizeSubDetails, hasOtherStockOut } from '../../utils/stockUtils'
import { formatDateForInput } from '../../utils/dateUtils'
import { OTHER_STOCK_OUT_TOKEN, TRANSFER_DESTINATIONS } from '../../constants'
import ActionCards from '../entry/ActionCards'

interface Props {
  item: ReportItem
  onClose: () => void
  onSuccess: () => void
  setOverlay: (v: boolean) => void
  historyCache: Record<string, ActionHistoryEntry[]>
  onHistoryCacheUpdate: (key: string, data: ActionHistoryEntry[]) => void
}

const NOTE_REQUIRED: ActionType[] = ['Other', 'ContactWH', 'ReturnWH', 'Destroy']

export default function ManageModal({ item, onClose, onSuccess, setOverlay, historyCache, onHistoryCacheUpdate }: Props) {
  const rawSub = item.subDetails || ''
  const rawNote = item.notes || ''
  const stockOutByOther = hasOtherStockOut(rawSub)
  const cleanSub = sanitizeSubDetails(rawSub)

  const [manageQty, setManageQty] = useState('')
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null)
  const [transferDest, setTransferDest] = useState(item.action === 'Transfer' ? cleanSub : '')
  const [subNote, setSubNote] = useState(rawNote)
  const [otherStockOut, setOtherStockOut] = useState(stockOutByOther)

  const [noteEditor, setNoteEditor] = useState(rawNote)
  const [expiryDateEdit, setExpiryDateEdit] = useState(formatDateForInput(item.expiryDate))
  const [lotNoEdit, setLotNoEdit] = useState((item.lotNo || '').trim())

  const maxQty = parseInt(item.qty, 10) || 0
  const activeAction = selectedAction ?? item.action

  const adjustQty = (amount: number) => {
    const v = Math.max(0, Math.min(maxQty, (parseInt(manageQty) || 0) + amount))
    setManageQty(String(v))
  }

  const rawLotNo = (item.lotNo || '').trim()
  let detailsToShow: string[] = []
  if (stockOutByOther) detailsToShow.push('[ตัด stock ออกจากห้องแล้ว]')
  if (cleanSub) detailsToShow.push(`[${cleanSub}]`)
  if (rawNote.trim()) detailsToShow.push(rawNote)
  const displayNote = detailsToShow.join(' ') || 'ไม่มีหมายเหตุสำหรับล็อตนี้'

  const handleSubmit = () => {
    const qty = parseInt(manageQty)
    if (!qty || qty <= 0) { MySwal.fire('คำเตือน', 'จำนวนไม่ถูกต้อง', 'warning'); return }
    if (qty > maxQty) { MySwal.fire('คำเตือน', 'จำนวนเกินคงเหลือ', 'warning'); return }
    if (selectedAction === 'Transfer' && !transferDest) {
      MySwal.fire({ icon: 'warning', title: 'ยังไม่ได้เลือกปลายทาง', text: 'กรุณาเลือกปลายทางสำหรับการส่งต่อ' })
      return
    }
    if (selectedAction && NOTE_REQUIRED.includes(selectedAction) && !subNote.trim()) {
      MySwal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกหมายเหตุ' })
      return
    }
    MySwal.fire({
      title: 'ยืนยันการอัปเดตหรือไม่?',
      text: `กำลังอัปเดตจำนวน ${manageQty} รายการ`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันการอัปเดต',
    }).then((result) => { if (result.isConfirmed) processManagement(qty) })
  }

  const processManagement = async (qty: number) => {
    let subVal: string | undefined
    if (!selectedAction) {
      subVal = undefined
    } else if (selectedAction === 'Transfer') {
      subVal = transferDest
    } else if (selectedAction === 'Other') {
      subVal = otherStockOut ? OTHER_STOCK_OUT_TOKEN : ''
    } else {
      subVal = ''
    }
    onClose()
    setOverlay(true)
    try {
      const res = await manageItem({
        id: item.id,
        manageQty: qty,
        newAction: activeAction,
        newDetails: subVal,
        newNotes: subNote.trim(),
      })
      setOverlay(false)
      if (res.success) {
        MySwal.fire({ icon: 'success', title: 'สำเร็จ', text: res.message, timer: 1500, showConfirmButton: false })
        onSuccess()
      } else {
        MySwal.fire('ผิดพลาด', res.message ?? '', 'error')
      }
    } catch (err) {
      setOverlay(false)
      MySwal.fire({ title: 'เชื่อมต่อไม่สำเร็จ', text: String(err), icon: 'error' })
    }
  }

  const handleSaveEdit = async () => {
    if (NOTE_REQUIRED.includes(item.action) && !noteEditor.trim()) {
      MySwal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'รายการประเภทนี้จำเป็นต้องมีหมายเหตุ' })
      return
    }
    setOverlay(true)
    try {
      const res = await editItemFields(item.id, {
        note: noteEditor,
        expiryDate: expiryDateEdit,
        lotNo: lotNoEdit,
      })
      setOverlay(false)
      if (res.success) {
        onClose()
        MySwal.fire({ icon: 'success', title: 'บันทึกการแก้ไขแล้ว', timer: 1200, showConfirmButton: false })
        onSuccess()
      } else {
        MySwal.fire('ผิดพลาด', res.message ?? '', 'error')
      }
    } catch (err) {
      setOverlay(false)
      MySwal.fire({ title: 'เชื่อมต่อไม่สำเร็จ', text: String(err), icon: 'error' })
    }
  }

  const handleEditStockQty = () => {
    MySwal.fire({
      title: '<span class="text-slate-800">ปรับจำนวนคงเหลือ</span>',
      html: `<div class="mb-4"><p class="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">จำนวนปัจจุบัน</p><p class="text-slate-600 text-xl font-semibold">${item.qty} <span class="text-xs text-slate-400">หน่วย</span></p></div>`,
      input: 'number',
      inputPlaceholder: 'จำนวนใหม่',
      inputValue: item.qty,
      showCancelButton: true,
      confirmButtonText: 'อัปเดตจำนวน',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        ...swalTheme,
        input: 'w-1/2 mx-auto text-center text-4xl font-bold text-blue-600 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none py-4 transition-all mb-6',
      },
      preConfirm: (v) => {
        if (v === '' || v === null || Number(v) < 0) { (window as any).Swal?.showValidationMessage('จำนวนไม่ถูกต้อง'); return false }
        return Number(v)
      },
    }).then((result) => {
      if (!result.isConfirmed) return
      setOverlay(true)
      updateStockQuantity(item.id, result.value).then((res) => {
        setOverlay(false)
        if (res.success) {
          MySwal.fire({ icon: 'success', title: 'อัปเดตจำนวนแล้ว', timer: 1000, showConfirmButton: false })
          onSuccess()
        } else {
          MySwal.fire('ผิดพลาด', res.message ?? '', 'error')
        }
      }).catch((err) => { setOverlay(false); MySwal.fire({ title: 'เชื่อมต่อไม่สำเร็จ', text: String(err), icon: 'error' }) })
    })
  }

  const handleDelete = () => {
    MySwal.fire({
      title: 'ลบรายการนี้หรือไม่?',
      html: `<p class="text-slate-500 text-sm mb-3">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
        <div class="mb-3"><input type="password" id="deletePin" class="w-full p-3 rounded-xl border border-slate-200 outline-none text-center text-lg tracking-widest font-bold focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all" placeholder="กรอก PIN" maxlength="4"></div>
        <textarea id="deleteNote" class="w-full p-3 rounded-xl border border-slate-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all text-base text-slate-600" rows="2" placeholder="เหตุผลในการลบ (ไม่บังคับ)..."></textarea>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันและลบ',
      cancelButtonText: 'ยกเลิก',
      didOpen: () => { (document.getElementById('deletePin') as HTMLInputElement)?.focus() },
      preConfirm: () => {
        const pin = (document.getElementById('deletePin') as HTMLInputElement)?.value
        const note = (document.getElementById('deleteNote') as HTMLTextAreaElement)?.value
        if (!pin) { (window as any).Swal?.showValidationMessage('กรุณากรอก PIN'); return false }
        if (pin !== '1234') { (window as any).Swal?.showValidationMessage('PIN ไม่ถูกต้อง'); return false }
        return note
      },
    }).then((result) => {
      if (!result.isConfirmed) return
      onClose()
      setOverlay(true)
      deleteItem(item.id, result.value || '').then((res) => {
        setOverlay(false)
        if (res.success) {
          MySwal.fire({ icon: 'success', title: 'ลบแล้ว', text: 'ลบรายการเรียบร้อยแล้ว', timer: 1500, showConfirmButton: false })
          onSuccess()
        } else {
          MySwal.fire('ผิดพลาด', res.message ?? '', 'error')
        }
      }).catch((err) => { setOverlay(false); MySwal.fire({ title: 'เชื่อมต่อไม่สำเร็จ', text: String(err), icon: 'error' }) })
    })
  }

  const handleHistory = async () => {
    const cacheKey = `${item.drugName.trim()}::30`
    let history: ActionHistoryEntry[]
    setOverlay(true)
    try {
      if (historyCache[cacheKey]) {
        history = historyCache[cacheKey]
      } else {
        history = await fetchActionHistory(item.drugName, 30)
        onHistoryCacheUpdate(cacheKey, history)
      }
      setOverlay(false)
      const html = history.length
        ? `<div class="space-y-3 max-h-[50vh] overflow-y-auto pr-1 text-left">${history.map((e) =>
            `<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="flex items-start justify-between gap-4">
                <div><p class="text-sm font-bold text-slate-800">${e.action}</p><p class="text-xs text-slate-400">${e.timestamp}</p></div>
                <span class="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-600">${e.qty}</span>
              </div>
              <p class="mt-2 text-sm text-slate-600 break-words">${e.details || '-'}</p>
            </div>`).join('')}</div>`
        : '<div class="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-8 text-center text-slate-500">ไม่พบประวัติสำหรับยานี้</div>'
      MySwal.fire({ title: `ประวัติ: ${item.drugName}`, html, width: 720, confirmButtonText: 'ปิด' })
    } catch (err) {
      setOverlay(false)
      MySwal.fire({ title: 'เชื่อมต่อไม่สำเร็จ', text: String(err), icon: 'error' })
    }
  }

  const showActionDynamic = !!selectedAction
  const noteRequired = selectedAction ? NOTE_REQUIRED.includes(selectedAction) : false

  return (
    <div id="manageModal" className="modal-bg fixed inset-0 z-50 flex items-start justify-center p-2 pt-3 sm:p-4 sm:pt-6">
      <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/60 bg-white shadow-lift max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-3rem)] sm:rounded-[2rem]">
        {/* Header */}
        <div className="bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_55%,#0369a1_100%)] px-4 py-4 text-white sm:px-7 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="section-title !text-white/70">จัดการรายการ</p>
              <h3 className="mt-1 text-2xl font-bold">{item.drugName}</h3>
              <p className="mt-2 text-sm text-white/80">อัปเดตรายการล็อตที่เลือกโดยไม่เปลี่ยน workflow เดิม</p>
            </div>
            <button
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white/80 backdrop-blur-sm transition-all hover:bg-white hover:text-teal-700 hover:shadow-lg active:scale-95"
              aria-label="ปิดหน้าต่างจัดการ"
            >
              <i className="fa-solid fa-xmark text-base"></i>
            </button>
          </div>
          {rawLotNo && (
            <div className="mt-3">
              <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold tracking-[0.14em] text-white/90">
                LOT NO. <span className="ml-2 tracking-normal">{rawLotNo}</span>
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain bg-slate-50/80 px-3 py-3 sm:px-7 sm:py-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              {/* Qty section */}
              <div className="section-card p-5">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="section-title">จำนวนที่ต้องการจัดการ</p>
                    <p className="mt-2 text-sm text-ink-500">ปรับเฉพาะจำนวนที่ต้องการดำเนินการจากล็อตนี้</p>
                  </div>
                  <span className="status-badge bg-brand-100 text-brand-800 uppercase">{item.unit || 'UNIT'}</span>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => adjustQty(-1)} className="custom-btn" aria-label="ลดจำนวน">
                    <div className="custom-btn-front"><i className="fa-solid fa-minus"></i></div>
                  </button>
                  <div className="min-w-[140px] flex-1 rounded-[1.2rem] border border-brand-100 bg-white px-4 py-3">
                    <input
                      type="number"
                      value={manageQty}
                      onChange={(e) => {
                        const v = Math.max(0, Math.min(maxQty, parseInt(e.target.value) || 0))
                        setManageQty(String(v))
                      }}
                      className="w-full bg-transparent text-center text-4xl font-bold text-brand-700 outline-none"
                      placeholder="0"
                    />
                  </div>
                  <button type="button" onClick={() => adjustQty(1)} className="custom-btn" aria-label="เพิ่มจำนวน">
                    <div className="custom-btn-front"><i className="fa-solid fa-plus"></i></div>
                  </button>
                  <button type="button" onClick={() => setManageQty(String(maxQty))} className="secondary-button px-4 text-brand-700">ALL</button>
                </div>
                <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-ink-600">
                  <span>คงเหลือปัจจุบัน:</span>
                  <span className="text-lg font-bold text-ink-900">{item.qty}</span>
                  <span className="font-bold uppercase tracking-[0.18em] text-brand-700">{item.unit || 'UNIT'}</span>
                  <button onClick={handleEditStockQty} className="text-brand-700 transition hover:text-brand-800" aria-label="แก้ไขจำนวน">
                    <i className="fa-solid fa-pen-to-square"></i>
                  </button>
                </div>
              </div>

              {/* Action section */}
              <div className="section-card p-5">
                <div>
                  <label className="section-title">สถานะใหม่</label>
                  <p className="mt-1 text-sm text-ink-500">หากไม่เปลี่ยน ระบบจะคง action เดิมไว้ หรือเลือก action ใหม่ด้านล่างได้</p>
                </div>
                <div className="mt-4">
                  <ActionCards
                    selected={selectedAction}
                    onChange={setSelectedAction}
                    name="manageAction"
                    variant="modal"
                    gridClass="grid grid-cols-4 gap-1.5 sm:gap-2"
                    iconSize="text-xl"
                    textSize="text-xs"
                  />
                </div>
              </div>

              {showActionDynamic && (
                <div className="section-card border border-brand-100 bg-brand-50/35 p-5 fade-in">
                  <label className="section-title">รายละเอียด</label>
                  <div className="mt-4 space-y-3">
                    {selectedAction === 'Transfer' && (
                      <select value={transferDest} onChange={(e) => setTransferDest(e.target.value)} className="select-shell" required>
                        <option value="" disabled>-- เลือกปลายทาง --</option>
                        {TRANSFER_DESTINATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    )}
                    <textarea
                      value={subNote}
                      onChange={(e) => setSubNote(e.target.value)}
                      placeholder={noteRequired ? 'หมายเหตุ (จำเป็น)...' : 'หมายเหตุ (ไม่บังคับ)...'}
                      className={`text-shell ${noteRequired ? 'border-blue-300 ring-1 ring-blue-200' : ''}`}
                      rows={3}
                    />
                    {selectedAction === 'Other' && (
                      <label className="flex items-center gap-3 rounded-2xl border border-lime-200 bg-lime-50 px-4 py-3 text-sm font-semibold text-lime-800">
                        <input type="checkbox" checked={otherStockOut} onChange={(e) => setOtherStockOut(e.target.checked)} className="h-5 w-5 rounded border-lime-300 text-lime-600 focus:ring-lime-400" />
                        <span>ตัด stock ออกจากห้องแล้ว</span>
                      </label>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="section-card p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                    <i className="fa-solid fa-pen-to-square"></i>
                  </div>
                  <div className="min-w-0">
                    <p className="section-title">แก้ไขข้อมูลรายการ</p>
                    <p className="mt-2 break-words text-sm leading-relaxed text-ink-700">{displayNote}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="section-title">วันหมดอายุ</label>
                    <input type="date" value={expiryDateEdit} onChange={(e) => setExpiryDateEdit(e.target.value)} className="field-shell text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="section-title">Lot No.</label>
                    <input type="text" value={lotNoEdit} onChange={(e) => setLotNoEdit(e.target.value)} placeholder="ระบุเลขล็อต (ถ้ามี)" className="field-shell text-sm" autoComplete="off" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="section-title">หมายเหตุ</label>
                    <textarea value={noteEditor} onChange={(e) => setNoteEditor(e.target.value)} placeholder="แก้ไขหมายเหตุที่บันทึกไว้..." className="text-shell" rows={3} />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button type="button" onClick={handleSaveEdit} className="btn-donate whitespace-nowrap justify-center px-3 text-sm">
                    <i className="fa-solid fa-floppy-disk shrink-0"></i> บันทึกการแก้ไข
                  </button>
                  <button type="button" onClick={handleHistory} className="secondary-button whitespace-nowrap justify-center px-3 text-sm text-amber-700">
                    <i className="fa-solid fa-clock-rotate-left shrink-0"></i> ดูประวัติ
                  </button>
                </div>
              </div>

              <div className="section-card p-5">
                <p className="section-title">ข้อควรระวัง</p>
                <div className="mt-4 space-y-3 text-sm text-ink-600">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">ตรวจสอบจำนวนให้ถูกต้องก่อนอัปเดตรายการล็อต</div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">หากไม่เลือกสถานะใหม่ ระบบจะคง action เดิมไว้</div>
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">การลบต้องใช้ PIN ยืนยันก่อนดำเนินการและไม่สามารถย้อนกลับได้</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:justify-between sm:px-7">
          <button onClick={handleDelete} className="danger-button w-full justify-center px-5 sm:w-auto">
            <i className="fa-solid fa-trash"></i> ลบรายการ
          </button>
          <button onClick={handleSubmit} className="btn-donate w-full justify-center sm:w-auto sm:min-w-[220px]">
            ยืนยันการอัปเดต <i className="fa-solid fa-floppy-disk"></i>
          </button>
        </div>
      </div>
    </div>
  )
}
