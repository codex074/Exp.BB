import { ActionStyle, ActionType } from '../types'

export const GAS_URL =
  'https://script.google.com/macros/s/AKfycbwHyEk6dmWlbm_YObxknK_C8NgUDSa1l9nbFDCRwuGQd-EpCtBnZiul6DZHapy_z3lqCg/exec'

export const SHEETS_URL =
  'https://docs.google.com/spreadsheets/d/1l7gEdZJrgfTbXPF3wWyM1DjfALJIKLM8zokXEfZLw_k/edit?usp=sharing'

export const ITEMS_PER_PAGE = 10
export const DAILY_ALERT_WINDOW = 30
export const OTHER_STOCK_OUT_TOKEN = '__ROOM_OUT__'
export const STOCK_EXCLUSION_ACTIONS: ActionType[] = ['ReturnWH', 'Transfer', 'Destroy', 'UsedUp']

export const ACTION_STYLES: Record<ActionType, ActionStyle> = {
  Sticker: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', label: 'ติด Sticker', icon: 'fa-tags' },
  Transfer: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', label: 'ส่งต่อ', icon: 'fa-share-from-square' },
  Separate: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', label: 'แยกเก็บ', icon: 'fa-box-open' },
  ContactWH: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', label: 'ติดต่อคลัง', icon: 'fa-phone-volume' },
  ReturnWH: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', label: 'คืนคลัง', icon: 'fa-truck-ramp-box' },
  UsedUp: { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200', label: 'ใช้หมดแล้ว', icon: 'fa-check-double' },
  Destroy: { bg: 'bg-slate-700', text: 'text-white', border: 'border-slate-600', label: 'ทำลาย', icon: 'fa-fire' },
  Other: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', label: 'อื่นๆ', icon: 'fa-ellipsis' },
}

export const TRANSFER_DESTINATIONS = [
  'IPD MED',
  'IPD SURG',
  'OPD SURG',
  'ER',
  'Napha',
  'เด็ก&จิตเวช',
]
