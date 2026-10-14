import Link from 'next/link'
import { PAYMENT_LABEL, humanize, rupiah } from '@/lib/format'
import { needsPayment } from '@/lib/payment'

const LABEL = 'text-[12px] font-semibold uppercase tracking-[.08em]'

// Where a guest's payment stands for one booking: unpaid → prompt to pay,
// pending_review → waiting for an admin, paid → confirmed.
export default function PaymentStatus({ booking, activity }) {
  const fee = `${rupiah(activity.fee_amount)} · ${PAYMENT_LABEL[activity.payment_mode]}`
  const status = booking.payment_status

  if (needsPayment(booking, activity)) {
    return (
      <div className="flex w-full flex-col gap-3 rounded-xl border-[1.5px] border-[#E7C66A] bg-[#FFF8E1] px-4 py-3.5 text-left">
        <div>
          <div className={`${LABEL} text-amber`}>Payment · not paid yet</div>
          <div className="text-[16px] font-bold">Pay {rupiah(activity.fee_amount)} to keep your spot</div>
          <div className="text-[14px] text-muted">{PAYMENT_LABEL[activity.payment_mode]} · scan the club QRIS and upload a screenshot</div>
        </div>
        <Link href={`/activities/${activity.id}/pay`} className="cc-btn-primary min-h-[50px] text-[19px] no-underline">
          Pay now
        </Link>
      </div>
    )
  }

  if (status === 'pending_review') {
    return (
      <div className="w-full rounded-xl bg-[#EEF1F5] px-4 py-3.5 text-left">
        <div className={`${LABEL} text-navy`}>Payment · in review</div>
        <div className="text-[16px] font-bold">Waiting for an admin to confirm your payment</div>
        <div className="text-[14px] text-muted">{fee} · proof received</div>
      </div>
    )
  }

  if (status === 'paid') {
    return (
      <div className="flex w-full items-center justify-between gap-3 rounded-xl bg-[#EEF1F5] px-4 py-3.5 text-left">
        <div>
          <div className={`${LABEL} text-muted`}>Payment</div>
          <div className="text-[16px] font-bold">Paid — your spot is confirmed</div>
          <div className="text-[14px] text-muted">{fee}</div>
        </div>
        <span className="shrink-0 rounded-full bg-[#FBE7A6] px-2.5 py-1 font-display text-[13px] font-extrabold tracking-[.1em] text-navy-deep">
          PAID ✓
        </span>
      </div>
    )
  }

  // Free sessions, or a status this screen doesn't know yet.
  return (
    <div className="w-full rounded-xl bg-[#EEF1F5] px-4 py-3.5 text-left">
      <div className={`${LABEL} text-muted`}>Payment</div>
      <div className="text-[16px] font-bold">
        {Number(activity.fee_amount) > 0 ? humanize(status) || 'Pending' : 'Free session — nothing to pay'}
      </div>
      {Number(activity.fee_amount) > 0 ? <div className="text-[14px] text-muted">{fee}</div> : null}
    </div>
  )
}
