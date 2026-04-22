interface Props {
  currentPage: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
}

export default function Pagination({ currentPage, totalPages, onPrev, onNext }: Props) {
  if (totalPages <= 1) return null
  return (
    <div className="section-card flex items-center justify-between gap-3 p-3 sm:p-4">
      <button onClick={onPrev} disabled={currentPage === 1} className="secondary-button px-4 text-sm font-bold text-ink-700">
        <i className="fa-solid fa-chevron-left text-xs"></i>
        <span className="hidden sm:inline">ก่อนหน้า</span>
      </button>
      <span className="text-sm font-semibold text-ink-500">หน้า {currentPage} จาก {totalPages}</span>
      <button onClick={onNext} disabled={currentPage === totalPages} className="secondary-button px-4 text-sm font-bold text-ink-700">
        <span className="hidden sm:inline">ถัดไป</span>
        <i className="fa-solid fa-chevron-right text-xs"></i>
      </button>
    </div>
  )
}
