interface Props {
  icon: string
  title: string
  description: string
  tone?: 'slate' | 'brand' | 'amber'
}

const tones = {
  slate: { iconWrap: 'bg-slate-100 text-slate-600', border: 'border-slate-200', title: 'text-slate-800', desc: 'text-slate-500' },
  brand: { iconWrap: 'bg-teal-50 text-teal-700', border: 'border-teal-100', title: 'text-slate-800', desc: 'text-slate-500' },
  amber: { iconWrap: 'bg-amber-50 text-amber-700', border: 'border-amber-100', title: 'text-slate-800', desc: 'text-slate-500' },
}

export default function StateCard({ icon, title, description, tone = 'slate' }: Props) {
  const p = tones[tone]
  return (
    <div className="col-span-full flex items-center justify-center py-6">
      <div className={`section-card ${p.border} w-full max-w-2xl px-8 py-10 text-center`}>
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl ${p.iconWrap}`}>
          <i className={`fa-solid ${icon} text-2xl`}></i>
        </div>
        <h3 className={`mt-5 text-xl font-bold ${p.title}`}>{title}</h3>
        <p className={`mt-2 text-sm leading-relaxed ${p.desc}`}>{description}</p>
      </div>
    </div>
  )
}
