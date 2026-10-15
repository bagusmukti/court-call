'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import CourtStatusBadge from '@/components/CourtStatusBadge'

const PER_TEAM = { singles: 1, doubles: 2 }

const BTN = 'cc-focus inline-flex min-h-10 cursor-pointer items-center justify-center rounded-[10px] px-3.5 text-[14px] font-semibold disabled:cursor-not-allowed disabled:opacity-50'
const BTN_NAVY = `${BTN} border-none bg-navy text-paper hover:bg-navy-deep`
const BTN_OUTLINE = `${BTN} border-[1.5px] border-navy bg-transparent text-navy hover:bg-navy hover:text-paper`
const BTN_QUIET = `${BTN} border-none bg-transparent text-muted hover:text-ink`
const BTN_DANGER = `${BTN} border-[1.5px] border-danger bg-transparent text-danger hover:bg-danger hover:text-white`

const sortCourts = (rows) =>
  (rows || []).slice().sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { numeric: true }))

// Players who can be picked: in the active queue, not on another court, and not marked no-show.
const available = (queue, playingIds) =>
  queue.filter((b) => !playingIds.has(b.user_id) && b.booking_status !== 'no_show')

// Top N available players, first half on team A.
function defaultPick(queue, playingIds, type) {
  const n = PER_TEAM[type] * 2
  return Object.fromEntries(available(queue, playingIds).slice(0, n).map((b, i) => [b.user_id, i < n / 2 ? 'a' : 'b']))
}

function StartMatchForm({ court, activityId, queue, playingIds, nameOf, onDone, onCancel }) {
  const [type, setType] = useState('doubles')
  const [picked, setPicked] = useState(() => defaultPick(queue, playingIds, 'doubles'))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const need = PER_TEAM[type]
  const ids = Object.keys(picked)
  // Keep both teams in queue order.
  const order = new Map(queue.map((b, i) => [b.user_id, i]))
  const team = (t) => ids.filter((uid) => picked[uid] === t).sort((x, y) => order.get(x) - order.get(y))
  const teamA = team('a')
  const teamB = team('b')
  const ready = teamA.length === need && teamB.length === need

  function changeType(next) {
    setType(next)
    setPicked(defaultPick(queue, playingIds, next))
    setError('')
  }

  function toggle(uid) {
    setPicked((prev) => {
      if (uid in prev) {
        const next = { ...prev }
        delete next[uid]
        return next
      }
      // New pick joins whichever team is short.
      const aCount = Object.values(prev).filter((t) => t === 'a').length
      return { ...prev, [uid]: aCount < need ? 'a' : 'b' }
    })
    setError('')
  }

  const switchTeam = (uid) => setPicked((prev) => ({ ...prev, [uid]: prev[uid] === 'a' ? 'b' : 'a' }))

  async function start(e) {
    e.preventDefault()
    if (!ready) return
    setBusy(true)
    setError('')
    try {
      const { error: rpcError } = await supabase.rpc('start_match', {
        p_activity_id: activityId,
        p_court_id: court.id,
        p_match_type: type,
        p_team_a: teamA,
        p_team_b: teamB,
      })
      if (rpcError) setError(rpcError.message)
      else onDone()
    } catch (err) {
      setError(err?.message || 'Couldn’t reach the server. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  const status = ready
    ? `${teamA.map(nameOf).join(' & ')} vs ${teamB.map(nameOf).join(' & ')}`
    : `Pick ${need} for Team A and ${need} for Team B (now ${teamA.length} v ${teamB.length}).`

  return (
    <form onSubmit={start} className="flex flex-col gap-3 rounded-xl bg-[#EEF1F5] p-3.5">
      <fieldset className="m-0 flex flex-wrap items-center gap-2 border-0 p-0">
        <legend className="cc-label mb-1.5 p-0">Match type</legend>
        {['singles', 'doubles'].map((t) => (
          <label
            key={t}
            className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-[10px] border-[1.5px] px-3.5 text-[14px] font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-navy ${
              type === t ? 'border-navy bg-navy text-paper' : 'border-field bg-white text-ink'
            }`}
          >
            <input type="radio" name={`type-${court.id}`} value={t} checked={type === t} onChange={() => changeType(t)} className="sr-only" />
            {t === 'singles' ? 'Singles · 1 v 1' : 'Doubles · 2 v 2'}
          </label>
        ))}
      </fieldset>

      <fieldset className="m-0 border-0 p-0">
        <legend className="cc-label mb-1.5 p-0">Players from the queue</legend>
        {queue.length === 0 ? (
          <div className="text-[14px] text-muted">No one’s in the queue yet.</div>
        ) : (
          <ul className="m-0 flex max-h-[320px] list-none flex-col gap-px overflow-auto rounded-[10px] border border-line bg-line-soft p-0">
            {queue.map((b, i) => {
              const uid = b.user_id
              const busyElsewhere = playingIds.has(uid)
              const noShow = b.booking_status === 'no_show'
              const on = uid in picked
              const inputId = `pick-${court.id}-${uid}`
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-2.5 bg-white px-3 py-2">
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={on}
                    disabled={busyElsewhere}
                    onChange={() => toggle(uid)}
                    className="size-5 shrink-0 accent-[#16398C]"
                  />
                  <label htmlFor={inputId} className={`min-w-0 flex-[1_1_140px] ${busyElsewhere ? 'text-muted' : ''}`}>
                    <span className="mr-2 font-display text-[16px] font-black tabular-nums text-muted">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[14px] font-semibold">{nameOf(uid)}</span>
                    {busyElsewhere ? <span className="ml-2 text-[12px]">· on another court</span> : null}
                    {noShow ? <span className="ml-2 text-[12px] font-semibold text-amber">· no-show</span> : null}
                  </label>
                  {on ? (
                    <button
                      type="button"
                      onClick={() => switchTeam(uid)}
                      aria-label={`${nameOf(uid)} is on Team ${picked[uid].toUpperCase()}. Switch team`}
                      className={`cc-focus inline-flex min-h-8 cursor-pointer items-center rounded-full border-none px-3 font-display text-[13px] font-extrabold uppercase tracking-[.08em] ${
                        picked[uid] === 'a' ? 'bg-navy text-paper' : 'bg-[#FBE7A6] text-navy-deep'
                      }`}
                    >
                      Team {picked[uid].toUpperCase()} ⇄
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </fieldset>

      <div className={`text-[14px] ${ready ? 'font-semibold text-ink' : 'text-amber font-semibold'}`} aria-live="polite">
        {status}
      </div>

      {error ? (
        <div role="alert" className="cc-alert">
          Couldn’t start the match: {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={!ready || busy} className={BTN_NAVY}>
          {busy ? 'Starting…' : `Start on ${court.name}`}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className={BTN_QUIET}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function CourtRow({ court, activityId, queue, matches, nameOf, onChanged }) {
  const [starting, setStarting] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const current = matches.byCourt[court.id]
  const inUse = court.status === 'in_use'

  async function endMatch() {
    setBusy(true)
    setError('')
    try {
      const { error: rpcError } = await supabase.rpc('end_match', { p_match_id: current.match.id })
      if (rpcError) setError(`Couldn’t end the match: ${rpcError.message}`)
      else {
        setConfirmEnd(false)
        onChanged()
      }
    } catch (err) {
      setError(err?.message || 'Couldn’t reach the server. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  const teamText = (ids) => ids.map(nameOf).join(' & ') || '—'

  return (
    <li className="flex flex-col gap-2.5 bg-surface px-[18px] py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="min-w-0 flex-[1_1_120px] truncate font-display text-[24px] font-black uppercase leading-none">
          {court.name}
        </span>
        <CourtStatusBadge status={court.status} />
        {court.status === 'idle' && !starting ? (
          <button type="button" onClick={() => setStarting(true)} className={BTN_OUTLINE}>
            Start match
          </button>
        ) : null}
        {inUse && current && !confirmEnd ? (
          <button type="button" onClick={() => setConfirmEnd(true)} className={BTN_OUTLINE}>
            End match
          </button>
        ) : null}
      </div>

      {inUse ? (
        current ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px]">
            <span className="text-[12px] font-semibold uppercase tracking-[.08em] text-muted">
              {current.match.match_type === 'singles' ? 'Singles' : 'Doubles'}
            </span>
            {current.loaded ? (
              <>
                <span className="font-semibold">{teamText(current.a)}</span>
                <span className="font-display text-[14px] font-extrabold tracking-[.1em] text-muted">VS</span>
                <span className="font-semibold">{teamText(current.b)}</span>
              </>
            ) : (
              <span className="text-muted">Loading players…</span>
            )}
          </div>
        ) : matches.ready ? (
          <div className="text-[13px] font-semibold text-amber">
            Marked in use, but no active match is recorded for this court.
          </div>
        ) : null
      ) : null}

      {confirmEnd && current ? (
        <div className="flex flex-wrap items-center gap-2.5 rounded-xl bg-[#EEF1F5] px-4 py-3">
          <span className="flex-[1_1_220px] text-[14px] font-semibold">End this match and free {court.name}?</span>
          <button type="button" onClick={endMatch} disabled={busy} className={BTN_DANGER}>
            {busy ? 'Ending…' : 'Yes, end match'}
          </button>
          <button type="button" onClick={() => setConfirmEnd(false)} disabled={busy} className={BTN_QUIET}>
            Cancel
          </button>
        </div>
      ) : null}

      {starting && court.status === 'idle' ? (
        <StartMatchForm
          court={court}
          activityId={activityId}
          queue={queue}
          playingIds={matches.playingIds}
          nameOf={nameOf}
          onCancel={() => setStarting(false)}
          onDone={() => {
            setStarting(false)
            onChanged()
          }}
        />
      ) : null}

      {error ? (
        <div role="alert" className="cc-alert">
          {error}
        </div>
      ) : null}
    </li>
  )
}

// Courts for one activity: add courts, start a match on an idle court, end one
// on an in-use court.
//   courtsLive: useLiveRows('courts', …)   matches: useLiveMatches(…)
//   queue: active bookings in queue order   names: useUserNames(…)
export default function CourtsSection({ activityId, courtsLive, matches, queue, names, onChanged }) {
  const { rows, error: loadError, applyRow } = courtsLive
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const courts = sortCourts(rows)
  const suggested = `Court ${courts.length + 1}`
  const nameOf = (uid) => names[uid]?.name || 'Guest'

  async function addCourt(e) {
    e.preventDefault()
    const trimmed = name.trim()
    setSaveError('')
    if (!trimmed) {
      setNameError('Give the court a name, e.g. “Court 1”.')
      return
    }
    if (courts.some((c) => String(c.name).trim().toLowerCase() === trimmed.toLowerCase())) {
      setNameError('There’s already a court with that name.')
      return
    }
    setNameError('')
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('courts')
        .insert({ activity_id: activityId, name: trimmed, status: 'idle' })
        .select()
      if (error) setSaveError(`Couldn’t add the court: ${error.message}`)
      else if (!data?.length) setSaveError('Couldn’t add the court — nothing was saved. Refresh and try again.')
      else {
        applyRow(data[0])
        setName('')
      }
    } catch (err) {
      setSaveError(err?.message || 'Couldn’t reach the server. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-labelledby="courts-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
        <h2 id="courts-heading" className="m-0 font-display text-[34px] font-black uppercase leading-none">
          Courts
        </h2>
        {courts.length ? (
          <div className="text-[14px] text-muted">
            {courts.filter((c) => c.status === 'in_use').length} of {courts.length} in use
          </div>
        ) : null}
      </div>

      {loadError || matches.error ? (
        <div role="alert" className="cc-alert">
          {loadError || matches.error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-line bg-line-soft">
        {rows === null ? (
          <div role="status" className="bg-surface px-[18px] py-3.5 text-[14px] text-muted">
            Loading courts…
          </div>
        ) : courts.length === 0 ? (
          <div className="bg-surface px-[18px] py-3.5 text-[15px] text-muted">
            No courts yet — add the courts you’ll play on for this session.
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-px p-0">
            {courts.map((c) => (
              <CourtRow
                key={c.id}
                court={c}
                activityId={activityId}
                queue={queue}
                matches={matches}
                nameOf={nameOf}
                onChanged={onChanged}
              />
            ))}
          </ul>
        )}

        <form onSubmit={addCourt} noValidate className="mt-px flex flex-wrap items-start gap-2.5 bg-surface px-[18px] py-3.5">
          <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1.5">
            <label htmlFor="court-name" className="cc-label">
              Court name
            </label>
            <input
              id="court-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (nameError) setNameError('')
              }}
              placeholder={`e.g. ${suggested}`}
              aria-invalid={nameError ? 'true' : undefined}
              aria-describedby={nameError ? 'court-name-error' : undefined}
              className="cc-input"
            />
            {nameError ? (
              <span id="court-name-error" className="cc-field-error">
                {nameError}
              </span>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="cc-focus mt-[22px] inline-flex min-h-12 cursor-pointer items-center justify-center rounded-[10px] border-none bg-navy px-5 font-display text-[18px] font-extrabold uppercase tracking-[.05em] text-paper hover:bg-navy-deep disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? 'Adding…' : '+ Add court'}
          </button>
        </form>
      </div>

      {saveError ? (
        <div role="alert" className="cc-alert">
          {saveError}
        </div>
      ) : null}
    </section>
  )
}
