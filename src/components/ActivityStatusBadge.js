// Pill for activities.status. Each state has its own look:
//   draft     grey outline      — not visible to guests yet
//   published pale yellow       — open for booking
//   ongoing   navy + live dot   — happening now
//   completed navy outline ✓    — done
//   cancelled red outline       — called off
const STYLES = {
  draft: { label: 'Draft', className: 'border-[1.5px] border-muted text-muted' },
  published: { label: 'Published', className: 'bg-[#FBE7A6] text-navy-deep' },
  ongoing: { label: 'Live', className: 'bg-navy-deep text-yellow', live: true },
  completed: { label: 'Completed ✓', className: 'border-[1.5px] border-navy text-navy' },
  cancelled: { label: 'Cancelled', className: 'border-[1.5px] border-danger text-danger' },
}

export default function ActivityStatusBadge({ status }) {
  const s = STYLES[status] || { label: String(status || 'Unknown'), className: 'border-[1.5px] border-muted text-muted' }
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-[13px] font-extrabold uppercase tracking-[.1em] ${s.className}`}
    >
      {s.live ? <span className="cc-live-dot" aria-hidden="true" /> : null}
      {s.label}
    </span>
  )
}
