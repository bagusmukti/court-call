'use client'

import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useGuest } from '@/lib/guestContext'
import { useActivity } from '@/lib/useActivity'
import { useLiveRows } from '@/lib/useLiveRows'
import { useLiveMatches } from '@/lib/useLiveMatches'
import { useQueueNames } from '@/lib/useNames'
import { clockTime, humanize, longDate } from '@/lib/format'
import BackLink from '@/components/BackLink'
import CourtCard from '@/components/CourtCard'

const GROUPS = ['Next game', 'Game after', 'Later']
const pad = (n) => String(n ?? '–').padStart(2, '0')

export default function LiveBoardPage() {
  const { id } = useParams()
  const { guest } = useGuest()
  const { activity, error: activityError } = useActivity(id)
  const bookingsLive = useLiveRows('bookings', id)
  const courtsLive = useLiveRows('courts', id)
  const matchesLive = useLiveMatches(id)
  const { byCourt, playingIds } = matchesLive

  const active = useMemo(
    () =>
      (bookingsLive.rows || [])
        .filter((b) => b.booking_status !== 'cancelled')
        .sort((a, b) => (a.queue_position ?? Infinity) - (b.queue_position ?? Infinity)),
    [bookingsLive.rows]
  )
  // Players on a court aren't waiting, so they leave "Up next" until their match ends.
  const queue = useMemo(() => active.filter((b) => !playingIds.has(b.user_id)), [active, playingIds])
  const courts = useMemo(
    () =>
      (courtsLive.rows || [])
        .slice()
        .sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { numeric: true })),
    [courtsLive.rows]
  )

  // One name lookup covers the queue and everyone on court.
  const names = useQueueNames(id, [...active.map((b) => b.user_id), ...playingIds].filter((uid) => uid !== guest.id))
  const person = (uid) => ({
    id: uid,
    me: uid === guest.id,
    name: uid === guest.id ? guest.name.trim().split(/\s+/)[0] : names[uid] || 'Player',
  })
  const teamsFor = (court) => {
    const m = byCourt[court.id]
    return m && m.loaded ? { a: m.a.map(person), b: m.b.map(person) } : null
  }
  const myCourt = courts.find((c) => {
    const m = byCourt[c.id]
    return m && [...m.a, ...m.b].includes(guest.id)
  })

  if (activityError) {
    return (
      <div className="flex flex-col gap-[18px]">
        <BackLink />
        <div role="alert" className="cc-alert">
          {activityError}
        </div>
      </div>
    )
  }

  const live = bookingsLive.live && courtsLive.live && matchesLive.live
  const loadError = bookingsLive.error || courtsLive.error || matchesLive.error
  const myIndex = queue.findIndex((b) => b.user_id === guest.id)
  const inUse = courts.filter((c) => c.status === 'in_use').length
  const start = activity ? new Date(activity.start_time) : null

  return (
    <div className="flex flex-col gap-5">
      <BackLink href={`/activities/${id}`}>← Back to the session</BackLink>

      <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-2.5">
        <div>
          {live ? (
            <div className="flex items-center gap-2 font-display text-[15px] font-extrabold uppercase tracking-[.12em] text-navy">
              <span className="cc-live-dot" aria-hidden="true" />
              Live{activity ? ` · ${activity.name}` : ''}
            </div>
          ) : (
            <div role="status" className="font-display text-[15px] font-extrabold uppercase tracking-[.12em] text-amber">
              Connecting to live updates…
            </div>
          )}
          <h1 className="cc-page-title">Live board</h1>
        </div>
        {activity ? (
          <div className="text-[14px] text-muted tabular-nums">
            {activity.location} · {longDate(start)} · {clockTime(start)}
          </div>
        ) : null}
      </div>

      {loadError ? (
        <div role="alert" className="cc-alert">
          {loadError}
        </div>
      ) : null}

      {myCourt ? (
        <div className="flex flex-wrap items-center gap-x-7 gap-y-2.5 rounded-2xl bg-yellow px-[22px] py-[18px] text-navy-deep">
          <div className="font-display text-[clamp(36px,5vw,52px)] font-black uppercase leading-[.9]">You’re on {myCourt.name}</div>
          <div className="flex-[1_1_240px] text-[15px] font-medium leading-normal">
            Head over now. When the game ends the desk frees the court and you’re back on the board.
          </div>
        </div>
      ) : myIndex >= 0 ? (
        <div className="flex flex-wrap items-center gap-x-7 gap-y-3 rounded-2xl bg-navy px-[22px] py-[18px] text-paper">
          <div className="flex items-baseline gap-3">
            <div className="font-display text-[72px] font-black leading-[.8] text-yellow tabular-nums">
              #{myIndex + 1}
            </div>
            <div className="font-display text-[20px] font-extrabold uppercase tracking-[.04em]">in the queue</div>
          </div>
          <div className="flex-[1_1_260px] text-pretty text-[15px] leading-normal text-paper/[.88]">
            {myIndex < 4
              ? 'You’re in the next game. Stay courtside — the desk will call you.'
              : `${myIndex} ${myIndex === 1 ? 'player is' : 'players are'} ahead of you. This board updates by itself — keep it open.`}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-start gap-5">
        <section aria-labelledby="courts-heading" className="flex min-w-0 flex-[999_1_540px] flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="courts-heading" className="m-0 font-display text-[32px] font-black uppercase leading-none">
              Courts
            </h2>
            {courts.length ? (
              <div className="text-[14px] text-muted" aria-live="polite">
                {inUse} of {courts.length} in use
              </div>
            ) : null}
          </div>
          {courtsLive.rows === null ? (
            <div role="status" className="text-[14px] text-muted">
              Loading courts…
            </div>
          ) : courts.length === 0 ? (
            <div className="cc-empty">
              <div className="cc-empty-title">No courts set up yet</div>
              <div className="mt-1 text-[15px] text-muted">The desk adds courts before play starts — they’ll appear here.</div>
            </div>
          ) : (
            <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,330px),1fr))] gap-4 p-0">
              {courts.map((c) => (
                <CourtCard key={c.id} court={c} teams={teamsFor(c)} />
              ))}
            </ul>
          )}
        </section>

        <aside
          aria-labelledby="queue-heading"
          className="flex min-w-0 flex-[1_1_300px] flex-col gap-1 rounded-2xl bg-navy-deep px-3.5 pb-3.5 pt-[18px] text-paper"
        >
          <div className="flex items-baseline justify-between gap-2.5 px-1.5 pb-1.5">
            <h2 id="queue-heading" className="m-0 font-display text-[32px] font-black uppercase leading-none">
              Up next
            </h2>
            <div className="text-[13px] text-paper/65" aria-live="polite">
              {queue.length} waiting
            </div>
          </div>

          {bookingsLive.rows === null ? (
            <div role="status" className="px-1.5 py-[18px] text-[14px] text-paper/70">
              Loading the queue…
            </div>
          ) : queue.length === 0 ? (
            <div className="px-1.5 py-[18px] text-[14px] text-paper/70">No one’s in the queue yet.</div>
          ) : (
            <ol className="m-0 flex list-none flex-col gap-1 p-0">
              {queue.map((b, i) => {
                const me = b.user_id === guest.id
                const name = me ? guest.name : names[b.user_id] || `Player ${pad(b.queue_position)}`
                return (
                  <li key={b.id} className="flex flex-col gap-1">
                    {i % 4 === 0 ? (
                      <div className="px-1.5 pb-0.5 pt-2.5 font-display text-[13px] font-extrabold uppercase tracking-[.16em] text-yellow">
                        {GROUPS[Math.min(2, i / 4)]}
                      </div>
                    ) : null}
                    <div
                      className={`flex min-h-12 items-center gap-3 rounded-[10px] py-1.5 pl-2.5 pr-2 ${
                        me ? 'bg-yellow text-navy-deep' : 'bg-paper/5 text-paper'
                      }`}
                    >
                      <div className="w-6 shrink-0 font-display text-[21px] font-black tabular-nums">{pad(i + 1)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-semibold">{name}</div>
                        <div className={`text-[12px] ${me ? 'text-navy-deep' : 'text-paper/60'}`}>
                          {humanize(b.booking_status) || 'Booked'}
                        </div>
                      </div>
                      {me ? (
                        <span className="rounded-full bg-navy-deep px-[9px] py-[3px] font-display text-[13px] font-black tracking-[.12em] text-paper">
                          YOU
                        </span>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </aside>
      </div>
    </div>
  )
}
