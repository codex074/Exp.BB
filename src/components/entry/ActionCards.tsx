import { ActionType } from '../../types'

const ENTRY_ACTIONS: { value: ActionType; label: string; icon: string; color: string }[] = [
  { value: 'Sticker', label: 'ติด Sticker', icon: 'fa-tags', color: 'text-orange-500' },
  { value: 'Transfer', label: 'ส่งต่อ', icon: 'fa-share-from-square', color: 'text-sky-600' },
  { value: 'Separate', label: 'แยกเก็บ', icon: 'fa-box-open', color: 'text-rose-500' },
  { value: 'ContactWH', label: 'ติดต่อคลัง', icon: 'fa-phone-volume', color: 'text-teal-600' },
  { value: 'ReturnWH', label: 'คืนคลัง', icon: 'fa-truck-ramp-box', color: 'text-emerald-600' },
  { value: 'Destroy', label: 'ทำลาย', icon: 'fa-fire', color: 'text-rose-600' },
  { value: 'Other', label: 'อื่นๆ', icon: 'fa-ellipsis', color: 'text-slate-500' },
]

const MODAL_ACTIONS: { value: ActionType; label: string; icon: string; color: string }[] = [
  { value: 'Sticker', label: 'ติด Sticker', icon: 'fa-tags', color: 'text-orange-500' },
  { value: 'Transfer', label: 'ส่งต่อ', icon: 'fa-share-from-square', color: 'text-sky-600' },
  { value: 'Separate', label: 'แยกเก็บ', icon: 'fa-box-open', color: 'text-rose-500' },
  { value: 'ContactWH', label: 'แจ้งคลัง', icon: 'fa-phone-volume', color: 'text-teal-600' },
  { value: 'ReturnWH', label: 'คืนคลัง', icon: 'fa-truck-ramp-box', color: 'text-emerald-600' },
  { value: 'UsedUp', label: 'ใช้หมดแล้ว', icon: 'fa-check-double', color: 'text-lime-600' },
  { value: 'Destroy', label: 'ทำลาย', icon: 'fa-fire', color: 'text-rose-600' },
  { value: 'Other', label: 'อื่นๆ', icon: 'fa-ellipsis', color: 'text-slate-500' },
]

interface Props {
  selected: ActionType | null
  onChange: (action: ActionType) => void
  name: string
  variant?: 'entry' | 'modal'
  gridClass?: string
  iconSize?: string
  textSize?: string
}

export default function ActionCards({
  selected,
  onChange,
  name,
  variant = 'entry',
  gridClass = 'grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7',
  iconSize = 'text-2xl',
  textSize = 'text-sm',
}: Props) {
  const actions = variant === 'modal' ? MODAL_ACTIONS : ENTRY_ACTIONS
  return (
    <div className={gridClass}>
      {actions.map((a) => (
        <label key={a.value} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={a.value}
            checked={selected === a.value}
            onChange={() => onChange(a.value)}
            className="action-card-input hidden"
          />
          <span className="action-card">
            <i className={`fa-solid ${a.icon} ${iconSize} ${a.color}`}></i>
            <span className={`${textSize} font-bold text-ink-700`}>{a.label}</span>
          </span>
        </label>
      ))}
    </div>
  )
}
