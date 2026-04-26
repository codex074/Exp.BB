import {
  collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Drug, DrugRecord, RawReportItem, ActionHistoryEntry, ActionLogEntry, ActionType } from '../types'
import { Timestamp } from 'firebase/firestore'
import { OTHER_STOCK_OUT_TOKEN } from '../constants'

const GAS_URL =
  'https://script.google.com/macros/s/AKfycbwHyEk6dmWlbm_YObxknK_C8NgUDSa1l9nbFDCRwuGQd-EpCtBnZiul6DZHapy_z3lqCg/exec'

const BATCH_SIZE = 500

// ── Import drug list from Google Sheets (one-time migration) ───────────────

export async function importDrugsFromGAS(): Promise<{ count: number }> {
  const res = await fetch(`${GAS_URL}?action=getDrugList`, { method: 'GET', redirect: 'follow' })
  const raw = await res.json()
  if (!Array.isArray(raw)) throw new Error('ข้อมูลจาก Google Sheets ไม่ถูกต้อง')

  const drugs = raw as { drugName: string; generic: string; strength: string; unit: string }[]

  // Clear existing drugs to prevent duplicates
  const existing = await getDocs(collection(db, 'drugs'))
  for (let i = 0; i < existing.docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db)
    existing.docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }

  // Write imported drugs in batches of 500
  for (let i = 0; i < drugs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db)
    drugs.slice(i, i + BATCH_SIZE).forEach((drug) => {
      batch.set(doc(collection(db, 'drugs')), {
        drugName: drug.drugName,
        generic: drug.generic || '',
        strength: drug.strength || '',
        unit: drug.unit || '',
      })
    })
    await batch.commit()
  }

  return { count: drugs.length }
}

// ── Import all items from Google Sheets (one-time migration) ──────────────

export async function importItemsFromGAS(): Promise<{ count: number }> {
  const res = await fetch(`${GAS_URL}?action=getReportData`, { method: 'GET', redirect: 'follow' })
  const raw = await res.json()
  if (!Array.isArray(raw)) throw new Error('ข้อมูลจาก Google Sheets ไม่ถูกต้อง')

  type GasItem = {
    drugName: string; strength: string; qty: number | string; unit: string
    expiryDate: string; action: string; subDetails: string; notes: string; lotNo: string
  }
  const items = raw as GasItem[]

  // Look up generic from Firestore drugs collection
  const drugsSnap = await getDocs(collection(db, 'drugs'))
  const genericMap = new Map<string, string>()
  drugsSnap.docs.forEach((d) => {
    const data = d.data()
    genericMap.set(`${data.drugName}||${data.strength}`, data.generic || '')
  })

  // Clear existing items
  const existing = await getDocs(collection(db, 'items'))
  for (let i = 0; i < existing.docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db)
    existing.docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }

  // Write in batches of 500
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = writeBatch(db)
    items.slice(i, i + BATCH_SIZE).forEach((item) => {
      batch.set(doc(collection(db, 'items')), {
        entryDate: '',
        drugName: item.drugName,
        generic: genericMap.get(`${item.drugName}||${item.strength}`) || '',
        strength: item.strength || '',
        unit: item.unit || '',
        lotNo: item.lotNo || '',
        qty: parseInt(String(item.qty)) || 0,
        expiryDate: item.expiryDate || '',
        action: item.action || 'Sticker',
        subDetails: item.subDetails || '',
        notes: item.notes || '',
        createdAt: serverTimestamp(),
      })
    })
    await batch.commit()
  }

  return { count: items.length }
}

// ── Drug CRUD ──────────────────────────────────────────────────────────────

export async function getDrugsWithIds(): Promise<DrugRecord[]> {
  const snap = await getDocs(collection(db, 'drugs'))
  return snap.docs
    .map((d) => {
      const data = d.data()
      return {
        id: d.id,
        drugName: data.drugName as string,
        generic: (data.generic as string) || '',
        strength: (data.strength as string) || '',
        unit: (data.unit as string) || '',
      }
    })
    .filter((d) => !!d.drugName)
    .sort((a, b) => a.drugName.localeCompare(b.drugName, 'th'))
}

export async function addDrug(
  data: Omit<DrugRecord, 'id'>,
): Promise<{ success: boolean }> {
  await addDoc(collection(db, 'drugs'), {
    drugName: data.drugName.trim(),
    generic: data.generic.trim(),
    strength: data.strength.trim(),
    unit: data.unit.trim(),
  })
  return { success: true }
}

export async function updateDrug(
  id: string,
  data: Omit<DrugRecord, 'id'>,
): Promise<{ success: boolean }> {
  await updateDoc(doc(db, 'drugs', id), {
    drugName: data.drugName.trim(),
    generic: data.generic.trim(),
    strength: data.strength.trim(),
    unit: data.unit.trim(),
  })
  return { success: true }
}

export async function deleteDrug(id: string): Promise<{ success: boolean }> {
  await deleteDoc(doc(db, 'drugs', id))
  return { success: true }
}

// ── Drug list ──────────────────────────────────────────────────────────────

export async function getDrugList(): Promise<Drug[]> {
  const snap = await getDocs(collection(db, 'drugs'))
  return snap.docs
    .map((d) => {
      const data = d.data()
      return {
        drugName: data.drugName as string,
        generic: data.generic as string,
        strength: data.strength as string,
        unit: data.unit as string,
        displayName: `${data.drugName} - ${data.strength}`,
      }
    })
    .filter((d) => !!d.drugName)
}

// ── Report data ────────────────────────────────────────────────────────────

export async function getReportData(): Promise<RawReportItem[]> {
  const snap = await getDocs(collection(db, 'items'))
  return snap.docs
    .map((d) => {
      const data = d.data()
      return {
        id: d.id,
        drugName: data.drugName as string,
        generic: (data.generic as string) || '',
        strength: (data.strength as string) || '',
        qty: String(data.qty ?? 0),
        unit: (data.unit as string) || '',
        expiryDate: (data.expiryDate as string) || '',
        action: data.action as ActionType,
        subDetails: (data.subDetails as string) || '',
        notes: (data.notes as string) || '',
        lotNo: (data.lotNo as string) || '',
      }
    })
    .filter((item) => !!item.drugName)
}

// ── Save new entry ─────────────────────────────────────────────────────────

export async function saveData(payload: {
  entryDate: string
  drugName: string
  generic: string
  strength: string
  unit: string
  lotNo: string
  qty: string
  expiryDate: string
  actionType: ActionType
  subDetails: string
  notes: string
}): Promise<{ success: boolean; message?: string }> {
  await addDoc(collection(db, 'items'), {
    entryDate: payload.entryDate,
    drugName: payload.drugName,
    generic: payload.generic || '',
    strength: payload.strength,
    unit: payload.unit,
    lotNo: payload.lotNo || '',
    qty: parseInt(payload.qty) || 0,
    expiryDate: payload.expiryDate,
    action: payload.actionType,
    subDetails: payload.subDetails || '',
    notes: payload.notes || '',
    createdAt: serverTimestamp(),
  })

  const detailLog = `${humanizeDetails(payload.subDetails || '')} ${payload.notes || ''}`.trim()
  await logAction(payload.drugName, payload.qty, `New Entry (${payload.actionType})`, detailLog)

  return { success: true, message: 'Saved successfully!' }
}

// ── Delete item ────────────────────────────────────────────────────────────

export async function deleteItem(
  id: string,
  note: string,
): Promise<{ success: boolean; message?: string }> {
  const docRef = doc(db, 'items', id)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) return { success: false, message: 'Item not found' }

  const data = docSnap.data()
  const detail = note.trim()
    ? `User deleted entire row | ${note.trim()}`
    : 'User deleted entire row'

  await logAction(data.drugName, String(data.qty), 'Deleted', detail)
  await deleteDoc(docRef)

  return { success: true, message: 'Deleted successfully' }
}

// ── Manage item (update in-place or split) ─────────────────────────────────

export async function manageItem(params: {
  id: string
  manageQty: number
  newAction: ActionType
  newDetails?: string
  newNotes: string
}): Promise<{ success: boolean; message?: string }> {
  const { id, manageQty, newAction, newDetails, newNotes } = params

  const docRef = doc(db, 'items', id)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) return { success: false, message: 'Item not found' }

  const orig = docSnap.data()
  const currentQty = parseInt(orig.qty) || 0
  const currentAction: ActionType = orig.action || ''
  const currentDetails: string = orig.subDetails || ''
  const currentNotes: string = orig.notes || ''

  if (manageQty <= 0) return { success: false, message: 'Quantity must be > 0' }
  if (manageQty > currentQty) return { success: false, message: 'Not enough stock' }

  const actionToUse = newAction || currentAction
  const detailsToUse =
    newDetails !== undefined ? newDetails : actionToUse === currentAction ? currentDetails : ''
  const notesToUse =
    newNotes !== undefined ? newNotes : actionToUse === currentAction ? currentNotes : ''

  const detailLog = `${humanizeDetails(detailsToUse)} ${notesToUse}`.trim()
  await logAction(orig.drugName, String(manageQty), actionToUse, detailLog)

  if (manageQty === currentQty) {
    await updateDoc(docRef, { action: actionToUse, subDetails: detailsToUse, notes: notesToUse })
    return { success: true, message: 'Updated all items successfully' }
  }

  // Split: reduce original qty, add new doc with managed qty + new action
  const remainQty = currentQty - manageQty
  await updateDoc(docRef, { qty: remainQty })
  await addDoc(collection(db, 'items'), {
    entryDate: orig.entryDate || '',
    drugName: orig.drugName,
    generic: orig.generic || '',
    strength: orig.strength || '',
    unit: orig.unit || '',
    lotNo: orig.lotNo || '',
    qty: manageQty,
    expiryDate: orig.expiryDate || '',
    action: actionToUse,
    subDetails: detailsToUse,
    notes: notesToUse,
    createdAt: serverTimestamp(),
  })

  return { success: true, message: `Split ${manageQty} items successfully` }
}

// ── Update stock quantity ──────────────────────────────────────────────────

export async function updateStockQuantity(
  id: string,
  newQty: number,
): Promise<{ success: boolean; message?: string }> {
  const docRef = doc(db, 'items', id)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) return { success: false, message: 'Item not found' }

  const data = docSnap.data()
  await logAction(
    data.drugName,
    String(newQty),
    'Stock Correction',
    `Adjusted from ${data.qty} to ${newQty}`,
  )
  await updateDoc(docRef, { qty: newQty })

  return { success: true, message: 'Stock adjusted successfully' }
}

// ── Edit item fields ───────────────────────────────────────────────────────

export async function editItemFields(
  id: string,
  fields: { note: string; expiryDate: string; lotNo: string },
): Promise<{ success: boolean; message?: string }> {
  const NOTE_REQUIRED: ActionType[] = ['Other', 'ContactWH', 'ReturnWH', 'Destroy']

  const docRef = doc(db, 'items', id)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) return { success: false, message: 'Item not found' }

  const data = docSnap.data()
  const newNote = String(fields.note ?? data.notes ?? '').trim()
  const newLotNo = String(fields.lotNo ?? data.lotNo ?? '').trim()
  const newExpiryDate = fields.expiryDate ? String(fields.expiryDate).trim() : null

  if (NOTE_REQUIRED.includes(data.action) && !newNote) {
    return { success: false, message: 'รายการประเภทนี้จำเป็นต้องมีหมายเหตุ' }
  }

  const update: Record<string, string> = { notes: newNote, lotNo: newLotNo }
  if (newExpiryDate) update.expiryDate = newExpiryDate

  await updateDoc(docRef, update)

  const changeLog = [`Note: "${newNote}"`, `LotNo: "${newLotNo}"`]
  if (newExpiryDate) changeLog.push(`Expiry: ${newExpiryDate}`)
  await logAction(data.drugName, String(data.qty), 'Fields Edited', changeLog.join(', '))

  return { success: true, message: 'แก้ไขข้อมูลสำเร็จ' }
}

// ── Action history ─────────────────────────────────────────────────────────

export async function fetchActionHistory(
  drugName: string,
  limitCount = 20,
): Promise<ActionHistoryEntry[]> {
  const name = (drugName || '').trim()
  if (!name) return []

  const q = query(
    collection(db, 'actionLog'),
    where('drugName', '==', name),
    orderBy('timestamp', 'desc'),
    limit(limitCount),
  )

  const snap = await getDocs(q)
  return snap.docs.map((d) => {
    const data = d.data()
    const ts = data.timestamp?.toDate?.() as Date | undefined
    return {
      timestamp: ts ? ts.toLocaleString('th-TH') : '',
      action: (data.action as string) || '',
      qty: String(data.qty ?? ''),
      details: (data.details as string) || '',
    }
  })
}

export interface FetchActionLogsOptions {
  startDate?: Date | null
  endDate?: Date | null
  limitCount?: number
}

export async function fetchAllActionLogs(
  options: FetchActionLogsOptions = {},
): Promise<ActionLogEntry[]> {
  const { startDate, endDate, limitCount = 500 } = options

  const constraints: any[] = []
  if (startDate) constraints.push(where('timestamp', '>=', Timestamp.fromDate(startDate)))
  if (endDate) constraints.push(where('timestamp', '<=', Timestamp.fromDate(endDate)))
  constraints.push(orderBy('timestamp', 'desc'))
  constraints.push(limit(limitCount))

  const q = query(collection(db, 'actionLog'), ...constraints)
  const snap = await getDocs(q)

  return snap.docs.map((d) => {
    const data = d.data()
    const ts = data.timestamp?.toDate?.() as Date | undefined
    return {
      id: d.id,
      timestamp: ts ? ts.toLocaleString('th-TH') : '',
      timestampDate: ts ?? null,
      drugName: (data.drugName as string) || '',
      action: (data.action as string) || '',
      qty: String(data.qty ?? ''),
      details: (data.details as string) || '',
    }
  })
}

// ── Internals ──────────────────────────────────────────────────────────────

async function logAction(
  drugName: string,
  qty: string,
  action: string,
  details: string,
): Promise<void> {
  await addDoc(collection(db, 'actionLog'), {
    timestamp: serverTimestamp(),
    drugName,
    qty,
    action,
    details,
  })
}

function humanizeDetails(details: string): string {
  const str = String(details || '')
  const normalized = str.replace(OTHER_STOCK_OUT_TOKEN, '').trim()
  if (str.includes(OTHER_STOCK_OUT_TOKEN)) {
    return normalized ? `ตัด stock ออกจากห้องแล้ว ${normalized}` : 'ตัด stock ออกจากห้องแล้ว'
  }
  return normalized
}
