interface Props { visible: boolean }

export default function LoadingOverlay({ visible }: Props) {
  if (!visible) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm">
      <div className="section-card flex w-[320px] flex-col items-center px-8 py-8 text-center">
        <div className="custom-loader"></div>
        <h2 className="mt-5 text-xl font-bold text-ink-900">กำลังประมวลผล...</h2>
        <p className="mt-2 text-sm text-ink-500">กรุณารอสักครู่ ระบบกำลังดำเนินการคำขอ</p>
      </div>
    </div>
  )
}
