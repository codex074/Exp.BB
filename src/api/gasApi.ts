import { GAS_URL } from '../constants'
import { ActionHistoryEntry } from '../types'

export async function callAPI<T>(action: string, payload?: unknown): Promise<T> {
  try {
    if (!payload) {
      const res = await fetch(`${GAS_URL}?action=${action}`, { method: 'GET', redirect: 'follow' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      return data as T
    } else {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        redirect: 'follow',
        body: JSON.stringify({ action, payload }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      })
      const data = await res.json()
      if (!data.success && data.message) throw new Error(data.message)
      return data as T
    }
  } catch (err) {
    throw new Error(String(err))
  }
}

export async function fetchActionHistory(
  drugName: string,
  limit = 20,
): Promise<ActionHistoryEntry[]> {
  const name = (drugName || '').trim()
  if (!name) return []
  const res = await fetch(
    `${GAS_URL}?action=getActionHistory&drugName=${encodeURIComponent(name)}&limit=${limit}`,
    { method: 'GET', redirect: 'follow' },
  )
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data as ActionHistoryEntry[]
}
