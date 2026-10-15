'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { firstRow, useGuest } from '@/lib/guestContext'
import { useActivity } from '@/lib/useActivity'
import { needsPayment } from '@/lib/payment'
import { PAYMENT_LABEL, clockTime, courtsLabel, longDate, rupiah } from '@/lib/format'
import PaymentStatus from '@/components/PaymentStatus'
import BackLink from '@/components/BackLink'
import DetailRow from '@/components/DetailRow'

const CLASS_LABEL = { 1: 'Class 1', 2: 'Class 2', 3: 'Class 3', 4: 'Class 4' }

const waLink = (number) => {
  const digits = String(number).replace(/\D/g, '').replace(/^0/, '62')
  return digits ? `https://wa.me/${digits}` : null
}

// The design's "You're in" confirmation from the booking sheet.
function BookingConfirmation({ booking, activity }) {
  return (
    <div className="flex flex-col items-center gap-2.5 text-center">
      <div role="status" className="flex flex-col items-center gap-2.5">
        <div className="cc-eyebrow">Booked · {activity.name}</div>
        <div className="font-display text-[clamp(52px,7vw,68px)] font-black uppercase leading-[.82]">You’re in</div>
        <div className="mt-2.5 flex items-baseline gap-3">
          <span className="font-display text-[clamp(80px,12vw,104px)] font-black leading-[.78] text-navy tabular-nums">
            #{booking.queue_position}
          </span>
          <span className="font-display text-[22px] font-extrabold uppercase">in the queue</span>
        </div>
        <span className="sr-only">You’re #{booking.queue_position} in the queue.</span>
      </div>
      <div className="mt-3 w-full">
        <PaymentStatus booking={booking} activity={activity} />
      </div>
      <p className="m-0 mt-1 max-w-[340px] text-pretty text-[15px] leading-normal text-ink-soft">
        Your spot is saved — come back to this page any time to check it.
      </p>
    </div>
  )
}

export default function ActivityDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { guest, bookings, bookingsReady, loadBookings, saveBooking } = useGuest()
  const { activity, error: loadError } = useActivity(id)
  const [contact, setContact] = useState(null)
  const [booking, setBooking] = useState(false)
  const [bookError, setBookError] = useState('')

  const contactId = activity?.contact_person_id
  useEffect(() => {
    if (!contactId) return
    let active = true
    async function loadContact() {
      // Users' rows may be hidden by RLS; the page still works without a contact.
      const { data } = await supabase.from('users').select('name, whatsapp_number').eq('id', contactId).maybeSingle()
      if (active && data) setContact(data)
    }
    loadContact()
    return () => {
      active = false
    }
  }, [contactId])

  const saved = bookings[id]

  // Re-check bookings with Supabase whenever this page opens.
  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  async function book() {
    setBooking(true)
    setBookError('')
    try {
      const { data, error } = await supabase.rpc('book_activity', {
        p_activity_id: id,
        p_guest_id: guest.id,
      })
      const row = firstRow(data)
      if (error) setBookError(error.message)
      else if (!row) setBookError('Booking didn’t go through — no booking came back. Try again in a moment.')
      else {
        // A repeat booking returns the existing row, so it lands here too.
        saveBooking(row)
        // Upfront sessions go straight on to paying, as in the design's booking sheet.
        if (activity.payment_mode === 'upfront' && needsPayment(row, activity)) router.push(`/activities/${id}/pay`)
      }
    } catch (err) {
      setBookError(err?.message || 'Couldn’t reach the server. Check your connection and try again.')
    } finally {
      setBooking(false)
    }
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-[18px]">
        <BackLink />
        <div role="alert" className="cc-alert">
          {loadError}
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
  const open = activity.status === 'published'
  const whatsapp = contact?.whatsapp_number ? waLink(contact.whatsapp_number) : null

  return (
    <div className="flex flex-col gap-[22px]">
      <BackLink />
      <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
        <div className="min-w-0">
          <div className="cc-eyebrow">{longDate(start)}</div>
          <h1 className="cc-page-title break-words">{activity.name}</h1>
        </div>
        <Link
          href={`/activities/${id}/live`}
          className="cc-focus inline-flex min-h-12 items-center gap-2.5 rounded-full bg-navy-deep px-[18px] font-display text-[17px] font-extrabold uppercase tracking-[.1em] text-paper no-underline hover:bg-navy"
        >
          <span className="cc-live-dot" aria-hidden="true" />
          Live queue
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="grid items-start gap-5 min-[1100px]:grid-cols-[minmax(0,1fr)_440px]">
        <section aria-label="Session details" className="flex overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="hidden w-[84px] shrink-0 flex-col items-center justify-center gap-0.5 bg-navy py-4 text-paper min-[480px]:flex">
            <div className="font-display text-[15px] font-extrabold tracking-[.14em] text-yellow">
              {start.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()}
            </div>
            <div className="font-display text-[54px] font-black leading-[.88] tabular-nums">
              {String(start.getDate()).padStart(2, '0')}
            </div>
            <div className="font-display text-[15px] font-extrabold tracking-[.14em] text-yellow">
              {start.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}
            </div>
          </div>
          <dl className="m-0 flex min-w-0 flex-1 flex-col px-5 py-[18px]">
            <DetailRow label="When">
              {longDate(start)} · {clockTime(start)}
            </DetailRow>
            <DetailRow label="Where">{activity.location}</DetailRow>
            {activity.planned_courts ? (
              <DetailRow label="Courts">{courtsLabel(activity.planned_courts)}</DetailRow>
            ) : null}
            <DetailRow label="Spots">{activity.max_participants} players</DetailRow>
            <DetailRow label="Fee">
              <span className="font-display text-[24px] font-black leading-none">{rupiah(activity.fee_amount)}</span>
            </DetailRow>
            <DetailRow label="Payment">{PAYMENT_LABEL[activity.payment_mode]}</DetailRow>
            <DetailRow label="Contact person">
              {contact ? (
                <>
                  {contact.name}
                  {whatsapp ? (
                    <>
                      {' · '}
                      <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="font-semibold">
                        WhatsApp
                      </a>
                    </>
                  ) : null}
                </>
              ) : (
                <span className="font-medium text-muted">Ask at the admin desk</span>
              )}
            </DetailRow>
          </dl>
        </section>

        <aside
          aria-label="Booking"
          className="flex flex-col gap-[18px] rounded-[20px] border border-line bg-surface px-[22px] pb-6 pt-[22px]"
        >
          {saved ? (
            <BookingConfirmation booking={saved} activity={activity} />
          ) : !bookingsReady ? (
            <div role="status" className="flex items-center gap-3 py-6 text-[15px] text-muted">
              <span aria-hidden="true" className="size-5 animate-spin rounded-full border-[3px] border-line border-t-navy" />
              Checking your booking…
            </div>
          ) : (
            <>
              <div className="cc-eyebrow">Book a spot</div>
              <div className="flex flex-col gap-[3px] rounded-xl bg-[#EEF1F5] px-4 py-3.5">
                <div className="text-[12px] font-semibold uppercase tracking-[.08em] text-muted">Playing as</div>
                <div className="text-[17px] font-bold">{guest.name}</div>
                <div className="text-[14px] text-muted">
                  {[guest.nrp && `NRP ${guest.nrp}`, CLASS_LABEL[guest.class_level], guest.whatsapp_number]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              <div className="flex items-baseline justify-between border-y border-line-soft py-3">
                <span className="text-[15px]">Court fee</span>
                <span className="font-display text-[28px] font-black">{rupiah(activity.fee_amount)}</span>
              </div>
              {bookError ? (
                <div id="book-error" role="alert" className="cc-alert">
                  {bookError}
                </div>
              ) : null}
              {open ? (
                <button
                  type="button"
                  onClick={book}
                  disabled={booking}
                  aria-describedby={bookError ? 'book-error' : undefined}
                  className="cc-btn-primary"
                >
                  {booking ? 'Booking…' : 'Book a spot'}
                </button>
              ) : (
                <div className="text-[14px] font-semibold text-amber">Booking is closed for this session.</div>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
