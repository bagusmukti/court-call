'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useAdmin } from '@/lib/adminContext'
import { useActivity } from '@/lib/useActivity'
import { useLiveRows } from '@/lib/useLiveRows'
import { useLiveMatches } from '@/lib/useLiveMatches'
import { useUserNames } from '@/lib/useNames'
import { PROOF_BUCKET } from '@/lib/payment'
import { PAYMENT_LABEL, clockTime, courtsLabel, humanize, longDate, rupiah } from '@/lib/format'
import BackLink from '@/components/BackLink'
import DetailRow from '@/components/DetailRow'
import PaymentBadge from '@/components/PaymentBadge'
import CourtsSection from './CourtsSection'
import QueueSection from './QueueSection'
import CommitteeSection from './CommitteeSection'
import { useMatchHistory } from '@/lib/useMatchHistory'
import MatchHistoryList from '@/components/MatchHistoryList'

const BTN = 'cc-focus inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[10px] px-4 text-[14px] font-semibold disabled:cursor-wait disabled:opacity-60'
const BTN_NAVY = `${BTN} border-none bg-navy text-paper hover:bg-navy-deep`
const BTN_OUTLINE = `${BTN} border-[1.5px] border-navy bg-transparent text-navy hover:bg-navy hover:text-paper`
const BTN_DANGER = `${BTN} border-[1.5px] border-danger bg-transparent text-danger hover:bg-danger hover:text-white`
const BTN_QUIET = `${BTN} border-none bg-transparent text-muted hover:text-ink`

const shortStamp = (iso) =>
  iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''

// Runs a payments write and treats "no row came back" as a failure, since RLS
// can filter a write without returning an error.
async function writePayment(query, failMessage) {
  const { data, error } = await query.select('id')
  if (error) return `${failMessage}: ${error.message}`
  if (!data?.length) return `${failMessage} — nothing was changed. Refresh and try again.`
  return ''
}

function ParticipantRow({ row, activity, adminId, onChanged }) {
  const { booking, guest, pending } = row
  const [reviewing, setReviewing] = useState(false)
  const [proofUrl, setProofUrl] = useState('')
  const [proofError, setProofError] = useState('')
  const [confirming, setConfirming] = useState(null) // 'reject' | 'cash'
  const [busy, setBusy] = useState(null)
  const [actionError, setActionError] = useState('')

  const fee = Number(activity.fee_amount)
  const canReview = booking.payment_status === 'pending_review' && pending
  const canTakeCash = booking.payment_status === 'unpaid' && fee > 0
  const rowId = `booking-${booking.id}`

  async function openReview() {
    setReviewing(true)
    setActionError('')
    if (proofUrl || !pending?.proof_image_url) return
    const { data, error } = await supabase.storage.from(PROOF_BUCKET).createSignedUrl(pending.proof_image_url, 3600)
    if (error) setProofError(`Couldn’t load the proof image: ${error.message}`)
    else setProofUrl(data.signedUrl)
  }

  async function run(kind, task) {
    setBusy(kind)
    setActionError('')
    try {
      const problem = await task()
      if (problem) {
        setActionError(problem)
        return
      }
      setReviewing(false)
      setConfirming(null)
      onChanged()
    } catch (err) {
      setActionError(err?.message || 'Couldn’t reach the server. Check your connection and try again.')
    } finally {
      setBusy(null)
    }
  }

  const approve = () =>
    run('approve', () =>
      writePayment(
        supabase
          .from('payments')
          .update({ status: 'confirmed', confirmed_by: adminId, paid_at: new Date().toISOString() })
          .eq('id', pending.id)
          .eq('status', 'pending_review'),
        'Couldn’t approve this payment'
      )
    )

  // Deleting the payments row is the rejection; a trigger sets the booking back to unpaid.
  const reject = () =>
    run('reject', () => writePayment(supabase.from('payments').delete().eq('id', pending.id), 'Couldn’t reject this proof'))

  const markCash = () =>
    run('cash', () =>
      writePayment(
        supabase.from('payments').insert({
          booking_id: booking.id,
          amount: fee,
          method: 'cash',
          status: 'confirmed',
          confirmed_by: adminId,
          paid_at: new Date().toISOString(),
        }),
        'Couldn’t record the cash payment'
      )
    )

  return (
    <li className="flex flex-col gap-3 bg-surface px-[18px] py-3.5" aria-labelledby={`${rowId}-name`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="w-11 shrink-0 font-display text-[26px] font-black tabular-nums text-muted">
          {String(booking.queue_position ?? '–').padStart(2, '0')}
        </div>
        <div className="min-w-0 flex-[1_1_180px]">
          <div id={`${rowId}-name`} className="truncate text-[15px] font-semibold">
            {guest?.name || 'Guest (name not visible)'}
          </div>
          <div className="text-[13px] text-muted">
            {guest?.nrp ? `NRP ${guest.nrp}` : 'NRP —'} · Booking {humanize(booking.booking_status).toLowerCase() || '—'}
          </div>
        </div>
        <PaymentBadge status={booking.payment_status} />
        <div className="ml-auto flex flex-wrap gap-2">
          {canReview && !reviewing ? (
            <button type="button" onClick={openReview} className={BTN_NAVY} aria-controls={`${rowId}-review`}>
              Review
            </button>
          ) : null}
          {canReview && reviewing ? (
            <button type="button" onClick={() => setReviewing(false)} className={BTN_QUIET}>
              Hide proof
            </button>
          ) : null}
          {canTakeCash && confirming !== 'cash' ? (
            <button type="button" onClick={() => setConfirming('cash')} className={BTN_OUTLINE}>
              Mark as paid (cash)
            </button>
          ) : null}
        </div>
      </div>

      {canTakeCash && confirming === 'cash' ? (
        <div className="flex flex-wrap items-center gap-2.5 rounded-xl bg-[#EEF1F5] px-4 py-3">
          <span className="flex-[1_1_220px] text-[14px] font-semibold">
            Received {rupiah(fee)} in cash from {guest?.name || 'this guest'}?
          </span>
          <button type="button" onClick={markCash} disabled={!!busy} className={BTN_NAVY}>
            {busy === 'cash' ? 'Saving…' : 'Yes, mark paid'}
          </button>
          <button type="button" onClick={() => setConfirming(null)} disabled={!!busy} className={BTN_QUIET}>
            Cancel
          </button>
        </div>
      ) : null}

      {canReview && reviewing ? (
        <div
          id={`${rowId}-review`}
          className="grid gap-4 rounded-xl bg-[#EEF1F5] p-3.5 min-[640px]:grid-cols-[minmax(0,280px)_minmax(0,1fr)]"
        >
          <div className="flex min-h-[200px] items-center justify-center overflow-hidden rounded-lg border border-line bg-white">
            {proofUrl ? (
              <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="cc-focus block">
                {/* Signed URL from private storage; next/image can't optimise it. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proofUrl}
                  alt={`Payment proof from ${guest?.name || 'guest'}`}
                  className="block max-h-[420px] w-full object-contain"
                />
              </a>
            ) : proofError ? (
              <span className="p-4 text-[13px] font-medium text-danger">{proofError}</span>
            ) : pending.proof_image_url ? (
              <span role="status" className="text-[13px] text-muted">
                Loading proof…
              </span>
            ) : (
              <span className="p-4 text-[13px] text-muted">No proof image was attached.</span>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-[.08em] text-muted">Amount submitted</div>
              <div className="font-display text-[28px] font-black leading-none">{rupiah(pending.amount)}</div>
              <div className="mt-1 text-[13px] text-muted">
                Fee {rupiah(fee)} · sent {shortStamp(pending.created_at)}
                {proofUrl ? ' · tap the image to open it full size' : ''}
              </div>
              {Number(pending.amount) !== fee ? (
                <div className="mt-1 text-[13px] font-semibold text-amber">Amount doesn’t match the session fee.</div>
              ) : null}
            </div>
            {confirming === 'reject' ? (
              <div className="flex flex-col gap-2.5">
                <span className="text-[14px] font-semibold">
                  Reject this proof? The guest goes back to unpaid and can upload again.
                </span>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={reject} disabled={!!busy} className={BTN_DANGER}>
                    {busy === 'reject' ? 'Rejecting…' : 'Yes, reject'}
                  </button>
                  <button type="button" onClick={() => setConfirming(null)} disabled={!!busy} className={BTN_QUIET}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={approve} disabled={!!busy} className={BTN_NAVY}>
                  {busy === 'approve' ? 'Approving…' : 'Approve'}
                </button>
                <button type="button" onClick={() => setConfirming('reject')} disabled={!!busy} className={BTN_DANGER}>
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {actionError ? (
        <div role="alert" className="cc-alert">
          {actionError}
        </div>
      ) : null}
    </li>
  )
}

export default function ManageActivityPage() {
  const { id } = useParams()
  const admin = useAdmin()
  const { activity, error: activityError } = useActivity(id)
  const [rows, setRows] = useState(null)
  const [listError, setListError] = useState('')
  const [version, setVersion] = useState(0)

  // Live data shared by the Courts and Queue sections.
  const bookingsLive = useLiveRows('bookings', id)
  const courtsLive = useLiveRows('courts', id)
  const matches = useLiveMatches(id)
  const queue = useMemo(
    () =>
      (bookingsLive.rows || [])
        .filter((b) => b.booking_status !== 'cancelled')
        .sort((a, b) => (a.queue_position ?? Infinity) - (b.queue_position ?? Infinity)),
    [bookingsLive.rows]
  )
  const history = useMatchHistory(id, matches.versionKey)
  const names = useUserNames([...queue.map((b) => b.user_id), ...matches.playingIds])
  const courtOf = useMemo(() => {
    const out = {}
    for (const c of courtsLive.rows || []) {
      const m = matches.byCourt[c.id]
      if (m) for (const uid of [...m.a, ...m.b]) out[uid] = c.name
    }
    return out
  }, [courtsLive.rows, matches.byCourt])

  // After any write: refresh the payments list, and re-fetch live data in case
  // Realtime is slow or disconnected.
  const { reload: reloadBookings } = bookingsLive
  const { reload: reloadCourts } = courtsLive
  const { reload: reloadMatches } = matches
  const refreshAll = () => {
    setVersion((v) => v + 1)
    reloadBookings()
    reloadCourts()
    reloadMatches()
  }

  useEffect(() => {
    let active = true
    async function load() {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('id, user_id, queue_position, booking_status, payment_status')
        .eq('activity_id', id)
        .order('queue_position', { ascending: true })
      if (!active) return
      if (error) {
        setListError(`Couldn’t load participants: ${error.message}`)
        return
      }

      const userIds = [...new Set(bookings.map((b) => b.user_id).filter(Boolean))]
      const bookingIds = bookings.map((b) => b.id)
      const [usersRes, paymentsRes] = await Promise.all([
        userIds.length ? supabase.from('users').select('id, name, nrp').in('id', userIds) : { data: [] },
        bookingIds.length
          ? supabase
              .from('payments')
              .select('id, booking_id, status, amount, method, proof_image_url, created_at')
              .in('booking_id', bookingIds)
              .eq('status', 'pending_review')
              .order('created_at', { ascending: false })
          : { data: [] },
      ])
      if (!active) return
      if (paymentsRes.error) {
        setListError(`Couldn’t load payments: ${paymentsRes.error.message}`)
        return
      }

      const guests = new Map((usersRes.data || []).map((u) => [u.id, u]))
      const pendingByBooking = new Map()
      for (const p of paymentsRes.data || []) if (!pendingByBooking.has(p.booking_id)) pendingByBooking.set(p.booking_id, p)

      setListError('')
      setRows(bookings.map((b) => ({ booking: b, guest: guests.get(b.user_id), pending: pendingByBooking.get(b.id) })))
    }
    load()
    return () => {
      active = false
    }
  }, [id, version])

  if (activityError) {
    return (
      <div className="flex flex-col gap-[18px]">
        <BackLink href="/admin">← Dashboard</BackLink>
        <div role="alert" className="cc-alert">
          {activityError}
        </div>
      </div>
    )
  }

  if (!activity) {
    return (
      <div role="status" className="text-[14px] text-muted">
        Loading activity…
      </div>
    )
  }

  const start = new Date(activity.start_time)
  const count = (status) => rows?.filter((r) => r.booking.payment_status === status).length || 0

  return (
    <div className="flex flex-col gap-[22px]">
      <BackLink href="/admin">← Dashboard</BackLink>
      <div>
        <div className="cc-eyebrow">Manage · {humanize(activity.status)}</div>
        <h1 className="cc-page-title break-words">{activity.name}</h1>
      </div>

      <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-x-6 rounded-2xl border border-line bg-surface px-5 py-[18px] [&>div]:border-t-0 [&>div]:py-1.5">
        <DetailRow label="When">
          {longDate(start)} · {clockTime(start)}
        </DetailRow>
        <DetailRow label="Where">{activity.location}</DetailRow>
        <DetailRow label="Spots">
          {rows ? `${rows.length} of ${activity.max_participants} booked` : `${activity.max_participants} players`}
          {activity.planned_courts ? ` · ${courtsLabel(activity.planned_courts)}` : ''}
        </DetailRow>
        <DetailRow label="Fee">
          {rupiah(activity.fee_amount)} · {PAYMENT_LABEL[activity.payment_mode]}
        </DetailRow>
      </dl>

      <CourtsSection
        activityId={id}
        courtsLive={courtsLive}
        matches={matches}
        queue={queue}
        names={names}
        onChanged={refreshAll}
      />

      <QueueSection
        activityId={id}
        adminId={admin.id}
        bookingsLive={bookingsLive}
        names={names}
        courtOf={courtOf}
        onChanged={() => setVersion((v) => v + 1)}
      />

      <CommitteeSection activityId={id} />

      <section aria-labelledby="history-heading" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
          <h2 id="history-heading" className="m-0 font-display text-[34px] font-black uppercase leading-none">
            Match history
          </h2>
          {history.rows?.length ? (
            <div className="text-[14px] text-muted">{history.rows.length} {history.rows.length === 1 ? 'match' : 'matches'} · newest first</div>
          ) : null}
        </div>
        {history.error ? (
          <div role="alert" className="cc-alert">
            {history.error}
          </div>
        ) : history.rows === null ? (
          <div role="status" className="text-[14px] text-muted">
            Loading match history…
          </div>
        ) : (
          <MatchHistoryList rows={history.rows} emptyText="Start a match on a court — finished games and their results show up here." />
        )}
      </section>

      <section aria-labelledby="participants-heading" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
          <h2 id="participants-heading" className="m-0 font-display text-[34px] font-black uppercase leading-none">
            Participants
          </h2>
          {rows?.length ? (
            <div className="text-[14px] text-muted">
              {count('paid')} paid · {count('pending_review')} to review · {count('unpaid')} unpaid
            </div>
          ) : null}
        </div>

        {listError ? (
          <div role="alert" className="cc-alert">
            {listError}
          </div>
        ) : rows === null ? (
          <div role="status" className="text-[14px] text-muted">
            Loading participants…
          </div>
        ) : rows.length === 0 ? (
          <div className="cc-empty">
            <div className="cc-empty-title">No bookings yet</div>
            <div className="mt-1 text-[15px] text-muted">Guests who book this session will show up here.</div>
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-px overflow-hidden rounded-2xl border border-line bg-line-soft p-0">
            {rows.map((row) => (
              <ParticipantRow
                key={row.booking.id}
                row={row}
                activity={activity}
                adminId={admin.id}
                onChanged={() => setVersion((v) => v + 1)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
