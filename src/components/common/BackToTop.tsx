interface Props { visible: boolean }

export default function BackToTop({ visible }: Props) {
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`back-to-top icon-button h-14 w-14 rounded-full border border-slate-200 bg-white text-brand-700 shadow-soft ${visible ? 'show' : ''}`}
      aria-label="กลับด้านบน"
    >
      <i className="fa-solid fa-arrow-up"></i>
    </button>
  )
}
