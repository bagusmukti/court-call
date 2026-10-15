'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

const GROUPS = ['Next game', 'Game after', 'Later']
const pad = (n) => String(n ?? '–').padStart(2, '0')

const STATUS = {
  booked: { label: 'Booked', className: 'border border-paper/30 text-paper/75' },
  checked_in: { label: 'Checked in ✓', className: 'bg-yellow text-navy-deep' },
  no_show: { label: 'No-show', className: 'bg-paper/10 text-[#FFC9B8]' },
}

const DARK_BTN =
  'cc-focus-on-dark inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-paper/25 bg-transparent px-3 text-[13px] font-semibold text-paper hover:bg-paper/10 disabled:cursor-wait disabled:opacity-50'
const ARROW_BTN =
  'cc-focus-on-dark flex size-10 cursor-pointer items-center justify-center rounded-lg border border-paper/20 bg-transparent text-[16px] text-paper hover:bg-paper/10 disabled:cursor-not-allowed disabled:opacity-30'
const LIGHT_BTN =
  'cc-focus inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border-none bg-navy px-3.5 text-[13px] font-semibold text-paper hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-50'

// Strips characters that have meaning inside a PostgREST or() filter.
const searchTerm = (q) => q.replace(/[,()%*\\]/g, ' ').trim()

// Runs one bookings update and treats "no row came back" as a failure, since
// RLS can filter a write without returning an error.
async function updateBooking(id, values) {
  const { data, error } = await supabase.from('bookings').update(values).eq('id', id).select()
  if (error) return { error }
  if (!data?.length) return { error: { message: 'nothing was changed — refresh and try again' } }
  return { row: data[0] }
}

function StatusBadge({ status }) {
  const s = STATUS[status] || { label: String(status || 'Unknown').replace(/_/g, ' '), className: 'border border-paper/30 text-paper/75' }
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-[3px] font-display text-[13px] font-extrabold uppercase tracking-[.08em] ${s.className}`}
    >
      {s.label}
    </span>
  )
}

// Search existing guests or create a name-only one, then book them at the end
// of the queue. Admin override: no capacity check.
function AddToQueue({ activityId, adminId, queuedUserIds, onAdded }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ term: '', rows: [], error: '' })
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  // A guest created on a failed attempt, so retrying doesn't create them twice.
  const [created, setCreated] = useState(null)

  const term = searchTerm(query)
  const searching = term.length >= 2

  useEffect(() => {
    if (term.length < 2) return
    let active = true
    const timer = setTimeout(async () => {
      const { data, error: searchError } = await supabase
        .from('users')
        .select('id, name, nrp')
        .eq('role', 'guest')
        .or(`name.ilike.%${term}%,nrp.ilike.%${term}%`)
        .order('name')
        .limit(8)
      if (!active) return
      setResults({ term, rows: data || [], error: searchError ? `Search failed: ${searchError.message}` : '' })
    }, 300)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [term])

  async function book(user) {
    // Next position after everything already used on this activity, read fresh
    // so two admins adding at once don't pick the same number from stale state.
    const { data: last, error: maxError } = await supabase
      .from('bookings')
      .select('queue_position')
      .eq('activity_id', activityId)
      .order('queue_position', { ascending: false, nullsFirst: false })
      .limit(1)
    if (maxError) return `Couldn’t work out the next queue position: ${maxError.message}`
    const next = (last?.[0]?.queue_position ?? 0) + 1

    const { data, error: insertError } = await supabase
      .from('bookings')
      .insert({
        activity_id: activityId,
        user_id: user.id,
        booking_status: 'booked',
        payment_status: 'unpaid',
        added_by: adminId,
        queue_position: next,
      })
      .select()
    if (insertError) return `Couldn’t add ${user.name}: ${insertError.message}`
    if (!data?.length) return `Couldn’t add ${user.name} — nothing was saved. Refresh and try again.`
    onAdded(data[0])
    setNotice(`${user.name} added at #${next}.`)
    return ''
  }

  async function addExisting(user) {
    setBusy(user.id)
    setError('')
    setNotice('')
    try {
      const problem = await book(user)
      if (problem) setError(problem)
      else setQuery('')
    } catch (err) {
      setError(err?.message || 'Couldn’t reach the server. Check your connection and try again.')
    } finally {
      setBusy(null)
    }
  }

  async function addNew(e) {
    e.preventDefault()
    const name = newName.trim()
    setError('')
    setNotice('')
    if (name.length < 2) {
      setError('Type the person’s name (at least 2 characters).')
      return
    }
    setBusy('new')
    try {
      let user = created && created.name === name ? created : null
      if (!user) {
        const { data, error: userError } = await supabase.from('users').insert({ name, role: 'guest' }).select('id, name')
        if (userError) {
          setError(`Couldn’t create ${name}: ${userError.message}`)
          return
        }
        if (!data?.length) {
          setError(`Couldn’t create ${name} — nothing was saved. Refresh and try again.`)
          return
        }
        user = data[0]
        setCreated(user)
      }
      const problem = await book(user)
      if (problem) setError(`${name} was created, but the booking failed. ${problem} Press the button again to retry.`)
      else {
        setNewName('')
        setCreated(null)
        setQuery('')
      }
    } catch (err) {
      setError(err?.message || 'Couldn’t reach the server. Check your connection and try again.')
    } finally {
      setBusy(null)
    }
  }

  const shown = searching && results.term === term ? results : null

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-line bg-surface p-[18px]">
      <div>
        <h3 className="m-0 font-display text-[24px] font-black uppercase leading-none">Add to queue</h3>
        <p className="m-0 mt-1 text-[13px] text-muted">Walk-ins, staff or sponsors. Goes to the end of the queue; capacity isn’t checked.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="queue-search" className="cc-label">
          Find a guest
        </label>
        <input
          id="queue-search"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setNotice('')
          }}
          placeholder="Name or NRP"
          autoComplete="off"
          className="cc-input"
        />
      </div>

      {searching ? (
        <div aria-live="polite" className="flex flex-col gap-1.5">
          {!shown ? (
            <div className="text-[13px] text-muted">Searching…</div>
          ) : shown.error ? (
            <div className="cc-field-error">{shown.error}</div>
          ) : shown.rows.length === 0 ? (
            <div className="text-[13px] text-muted">No guests match “{term}”. Add them as a new person below.</div>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-px overflow-hidden rounded-xl border border-line bg-line-soft p-0">
              {shown.rows.map((u) => {
                const queued = queuedUserIds.has(u.id)
                return (
                  <li key={u.id} className="flex flex-wrap items-center gap-2.5 bg-white px-3 py-2">
                    <div className="min-w-0 flex-[1_1_140px]">
                      <div className="truncate text-[14px] font-semibold">{u.name}</div>
                      <div className="text-[12px] text-muted">{u.nrp ? `NRP ${u.nrp}` : 'No NRP'}</div>
                    </div>
                    {queued ? (
                      <span className="text-[12px] font-semibold text-muted">Already in queue</span>
                    ) : (
                      <button type="button" onClick={() => addExisting(u)} disabled={!!busy} className={LIGHT_BTN}>
                        {busy === u.id ? 'Adding…' : 'Add'}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : null}

      <form onSubmit={addNew} noValidate className="flex flex-col gap-1.5 border-t border-line-soft pt-3.5">
        <label htmlFor="queue-new-name" className="cc-label">
          Or add a new person
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="queue-new-name"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Full name"
            autoComplete="off"
            className="cc-input min-w-0 flex-[1_1_160px]"
          />
          <button type="submit" disabled={!!busy} className={`${LIGHT_BTN} min-h-12 px-4`}>
            {busy === 'new' ? 'Adding…' : 'Create & add'}
          </button>
        </div>
        <span className="text-[12px] text-muted">Creates a guest with no NRP.</span>
      </form>

      {error ? (
        <div role="alert" className="cc-alert">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div role="status" className="text-[14px] font-semibold text-navy">
          {notice}
        </div>
      ) : null}
    </div>
  )
}

// Queue operations for one activity: reorder, check in / no-show, manual add.
//   bookingsLive: useLiveRows('bookings', …) from the page (shared with Courts)
//   names:        useUserNames(…) from the page → { [userId]: { name, nrp } }
//   courtOf:      { [userId]: courtName } for players currently on a court
export default function QueueSection({ activityId, adminId, bookingsLive, names, courtOf, onChanged }) {
  const { rows, error: loadError, applyRow } = bookingsLive
  const [busyId, setBusyId] = useState(null)
  const [rowError, setRowError] = useState({ id: null, message: '' })

  const queue = useMemo(
    () =>
      (rows || [])
        .filter((b) => b.booking_status !== 'cancelled')
        .sort((a, b) => (a.queue_position ?? Infinity) - (b.queue_position ?? Infinity)),
    [rows]
  )
  const queuedUserIds = useMemo(() => new Set(queue.map((b) => b.user_id)), [queue])

  async function act(booking, task) {
    setBusyId(booking.id)
    setRowError({ id: null, message: '' })
    try {
      const problem = await task()
      if (problem) setRowError({ id: booking.id, message: problem })
      else onChanged()
    } catch (err) {
      setRowError({ id: booking.id, message: err?.message || 'Couldn’t reach the server. Check your connection and try again.' })
    } finally {
      setBusyId(null)
    }
  }

  const setStatus = (booking, status) =>
    act(booking, async () => {
      const { row, error } = await updateBooking(booking.id, { booking_status: status })
      if (error) return `Couldn’t update the status: ${error.message}`
      applyRow(row)
      return ''
    })

  // Swap queue_position with the neighbour. If a unique constraint on
  // (activity, position) rejects the direct swap, go through a temporary
  // position; if the second write fails, put the first one back.
  const move = (booking, neighbour) =>
    act(booking, async () => {
      const a = booking.queue_position
      const b = neighbour.queue_position
      let first = await updateBooking(booking.id, { queue_position: b })
      let viaTemp = false
      if (first.error?.code === '23505') {
        viaTemp = true
        first = await updateBooking(booking.id, { queue_position: -Math.floor(Date.now() / 1000) })
      }
      if (first.error) return `Couldn’t move this booking: ${first.error.message}`

      const second = await updateBooking(neighbour.id, { queue_position: a })
      if (second.error) {
        const undo = await updateBooking(booking.id, { queue_position: a })
        if (!undo.error) applyRow(undo.row)
        return `Couldn’t swap places: ${second.error.message}${undo.error ? ' — positions may be out of order; refresh the page.' : ''}`
      }
      applyRow(second.row)

      if (viaTemp) {
        const third = await updateBooking(booking.id, { queue_position: b })
        if (third.error) return `Couldn’t finish the swap: ${third.error.message} — refresh the page.`
        applyRow(third.row)
      } else {
        applyRow(first.row)
      }
      return ''
    })

  const checkedIn = queue.filter((b) => b.booking_status === 'checked_in').length

  return (
    <section aria-labelledby="queue-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
        <h2 id="queue-heading" className="m-0 font-display text-[34px] font-black uppercase leading-none">
          Queue
        </h2>
        {queue.length ? (
          <div className="text-[14px] text-muted">
            {queue.length} in queue · {checkedIn} checked in
          </div>
        ) : null}
      </div>

      {loadError ? (
        <div role="alert" className="cc-alert">
          {loadError}
        </div>
      ) : null}

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-1 rounded-2xl bg-navy-deep px-3.5 pb-3.5 pt-3 text-paper">
          {rows === null ? (
            <div role="status" className="px-1.5 py-4 text-[14px] text-paper/70">
              Loading the queue…
            </div>
          ) : queue.length === 0 ? (
            <div className="px-1.5 py-4 text-[14px] text-paper/70">No one’s in the queue yet.</div>
          ) : (
            <ol className="m-0 flex list-none flex-col gap-1 p-0">
              {queue.map((b, i) => {
                const person = names[b.user_id]
                const name = person?.name || `Guest ${pad(b.queue_position)}`
                const busy = busyId === b.id
                const locked = !!busyId
                return (
                  <li key={b.id} className="flex flex-col gap-1">
                    {i % 4 === 0 ? (
                      <div className="px-1.5 pb-0.5 pt-2 font-display text-[13px] font-extrabold uppercase tracking-[.16em] text-yellow">
                        {GROUPS[Math.min(2, i / 4)]}
                      </div>
                    ) : null}
                    <div
                      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[10px] bg-paper/5 py-2 pl-2.5 pr-2"
                    >
                      <div className="w-7 shrink-0 font-display text-[21px] font-black tabular-nums">{pad(i + 1)}</div>
                      <div className="min-w-0 flex-[1_1_150px]">
                        <div className="truncate text-[15px] font-semibold">{name}</div>
                        <div className="text-[12px] text-paper/60">
                          {person?.nrp ? `NRP ${person.nrp}` : 'No NRP'}
                          {b.added_by ? ' · added by desk' : ''}
                        </div>
                      </div>
                      <StatusBadge status={b.booking_status} />
                      {courtOf[b.user_id] ? (
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-paper/10 px-2.5 py-[3px] font-display text-[13px] font-extrabold uppercase tracking-[.08em] text-yellow">
                          <span className="cc-live-dot" aria-hidden="true" />
                          On {courtOf[b.user_id]}
                        </span>
                      ) : null}
                      <div className="ml-auto flex flex-wrap items-center gap-1.5">
                        {b.booking_status !== 'checked_in' ? (
                          <button type="button" onClick={() => setStatus(b, 'checked_in')} disabled={locked} className={DARK_BTN}>
                            Check in
                          </button>
                        ) : null}
                        {b.booking_status !== 'no_show' ? (
                          <button type="button" onClick={() => setStatus(b, 'no_show')} disabled={locked} className={DARK_BTN}>
                            No-show
                          </button>
                        ) : null}
                        {b.booking_status === 'checked_in' || b.booking_status === 'no_show' ? (
                          <button
                            type="button"
                            onClick={() => setStatus(b, 'booked')}
                            disabled={locked}
                            className={`${DARK_BTN} border-transparent text-paper/70 underline underline-offset-2`}
                          >
                            Reset
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => move(b, queue[i - 1])}
                          disabled={locked || i === 0}
                          aria-label={`Move ${name} up`}
                          className={ARROW_BTN}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => move(b, queue[i + 1])}
                          disabled={locked || i === queue.length - 1}
                          aria-label={`Move ${name} down`}
                          className={ARROW_BTN}
                        >
                          ↓
                        </button>
                      </div>
                      {busy ? (
                        <div role="status" className="w-full pl-10 text-[12px] text-paper/70">
                          Saving…
                        </div>
                      ) : null}
                      {rowError.id === b.id ? (
                        <div role="alert" className="w-full pl-10 text-[13px] font-medium text-[#FFC9B8]">
                          {rowError.message}
                        </div>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>

        <div className="min-w-0 flex-[1_1_300px]">
          <AddToQueue
            activityId={activityId}
            adminId={adminId}
            queuedUserIds={queuedUserIds}
            onAdded={(row) => {
              applyRow(row)
              onChanged()
            }}
          />
        </div>
      </div>
    </section>
  )
}
