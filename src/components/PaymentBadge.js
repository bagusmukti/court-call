const BADGES = {
  unpaid: { label: 'Unpaid', className: 'border-[1.5px] border-amber text-amber' },
  pending_review: { label: 'To review', className: 'bg-navy text-paper' },
  paid: { label: 'Paid ✓', className: 'bg-[#FBE7A6] text-navy-deep' },
  refunded: { label: 'Refunded', className: 'border-[1.5px] border-muted text-muted' },
}

// Pill for a booking's payment_status.
export default function PaymentBadge({ status }) {
  const badge = BADGES[status] || { label: String(status || 'Unknown').replace(/_/g, ' '), className: 'border-[1.5px] border-muted text-muted' }
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 font-display text-[13px] font-extrabold uppercase tracking-[.1em] ${badge.className}`}
    >
      {badge.label}
    </span>
  )
}
