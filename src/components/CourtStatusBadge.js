// Pill for courts.status: in_use is the "live" state, idle means the court is free.
export default function CourtStatusBadge({ status }) {
  if (status === 'in_use') {
    return (
      <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-navy-deep px-[11px] py-[5px] font-display text-[15px] font-extrabold uppercase tracking-[.08em] text-yellow">
        <span className="cc-live-dot" aria-hidden="true" />
        In use
      </span>
    )
  }
  if (status === 'idle') {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full border-[1.5px] border-navy px-[11px] py-1 font-display text-[15px] font-extrabold uppercase tracking-[.1em] text-navy">
        Open
      </span>
    )
  }
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border-[1.5px] border-muted px-[11px] py-1 font-display text-[15px] font-extrabold uppercase tracking-[.1em] text-muted">
      {String(status || 'Unknown').replace(/_/g, ' ')}
    </span>
  )
}
