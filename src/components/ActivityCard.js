const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

const PAYMENT_LABEL = { upfront: 'Pay upfront', deferred: 'Pay later' }

const rupiah = (v) => (Number(v) > 0 ? 'Rp ' + Number(v).toLocaleString('id-ID') : 'Free')

const CARD = 'flex w-full overflow-hidden rounded-2xl border border-line bg-surface text-left'

// The design's Activities card. `badge` sits beside the title, `action` beside
// the fee, `footer` under everything. Pass `onSelect` to make the whole card
// one button — only when it has no other controls inside.
export default function ActivityCard({ activity, badge, action, footer, onSelect }) {
  const start = new Date(activity.start_time)
  const time = start
    .toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
    .replace('.', ':')
  const courts = activity.planned_courts
    ? `${activity.planned_courts} ${activity.planned_courts === 1 ? 'court' : 'courts'} · `
    : ''

  const body = (
    <>
      <div className="flex w-[84px] shrink-0 flex-col items-center justify-center gap-0.5 bg-navy py-4 text-paper">
        <div className="font-display text-[15px] font-extrabold tracking-[.14em] text-yellow">{DOW[start.getDay()]}</div>
        <div className="font-display text-[54px] font-black leading-[.88] tabular-nums">
          {String(start.getDate()).padStart(2, '0')}
        </div>
        <div className="font-display text-[15px] font-extrabold tracking-[.14em] text-yellow">
          {MON[start.getMonth()]}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3 px-[18px] py-4">
        <div className="flex items-start justify-between gap-2.5">
          <div className="break-words font-display text-[27px] font-black uppercase leading-[.95]">{activity.name}</div>
          {badge}
        </div>
        <div className="text-[14px] leading-normal text-muted">
          {time} · {activity.location}
          <br />
          {courts}
          {activity.max_participants} spots
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <div className="font-display text-[23px] font-black leading-none">{rupiah(activity.fee_amount)}</div>
            <div className="mt-[3px] text-[12px] text-muted">{PAYMENT_LABEL[activity.payment_mode]}</div>
          </div>
          {action}
        </div>
        {footer}
      </div>
    </>
  )

  return (
    <li className="flex">
      {onSelect ? (
        <button
          type="button"
          onClick={() => onSelect(activity)}
          className={`${CARD} cc-focus cursor-pointer p-0 font-[inherit] text-ink transition-colors hover:border-navy`}
        >
          {body}
        </button>
      ) : (
        <div className={CARD}>{body}</div>
      )}
    </li>
  )
}
