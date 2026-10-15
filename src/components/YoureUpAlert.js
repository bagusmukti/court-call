'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { clockTime } from '@/lib/format'

const teamOf = (value) => (String(value || '').toLowerCase().endsWith('b') ? 'b' : 'a')

// Short two-note chime. Browsers only allow sound after the guest has
// interacted with the page; if it's blocked, the visual alert still shows.
function chime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const notes = [880, 1320]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.22
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.4)
    })
    setTimeout(() => ctx.close(), 1200)
  } catch {
    // No sound — the alert is still on screen.
  }
  try {
    navigator.vibrate?.([200, 100, 200])
  } catch {
    // Vibration unsupported.
  }
}

// Builds the alert from a new match_participants row: the match's court and
// type, plus partner/opponent first names when they can be read.
async function describe(row, activityId, guestId) {
  const { data: match } = await supabase
    .from('matches')
    .select('id, activity_id, court_id, match_type')
    .eq('id', row.match_id)
    .maybeSingle()
  // Only matches for the activity this guest is looking at.
  if (!match || match.activity_id !== activityId) return null

  const [{ data: court }, { data: players }, { data: names }] = await Promise.all([
    supabase.from('courts').select('id, name').eq('id', match.court_id).maybeSingle(),
    supabase.from('match_participants').select('user_id, team').eq('match_id', match.id),
    supabase.rpc('get_activity_queue_names', { p_activity_id: activityId }),
  ])

  const nameOf = Object.fromEntries((names || []).map((n) => [n.user_id, n.display_name]))
  const me = (players || []).find((p) => p.user_id === guestId)
  const myTeam = me ? teamOf(me.team) : teamOf(row.team)
  const others = (players || []).filter((p) => p.user_id !== guestId)
  const label = (list) => list.map((p) => nameOf[p.user_id]).filter(Boolean).join(' & ')

  return {
    matchId: match.id,
    court: court?.name || 'your court',
    type: match.match_type === 'singles' ? 'Singles' : match.match_type === 'doubles' ? 'Doubles' : '',
    partner: label(others.filter((p) => teamOf(p.team) === myTeam)),
    opponents: label(others.filter((p) => teamOf(p.team) !== myTeam)),
    at: clockTime(new Date()),
  }
}

// Full-screen "You're up" announcement for one activity. Listens for new
// match_participants rows for this guest while any of the activity's pages are
// open. Only Realtime INSERTs during this visit trigger it — rows that already
// existed when the page loaded never do, so a refresh won't re-announce.
export default function YoureUpAlert({ activityId, guestId }) {
  const [call, setCall] = useState(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (!activityId || !guestId) return
    let active = true
    const channel = supabase
      .channel(`youre-up-${guestId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'match_participants', filter: `user_id=eq.${guestId}` },
        async ({ new: row }) => {
          if (!row || row.user_id !== guestId) return
          try {
            const next = await describe(row, activityId, guestId)
            if (active && next) {
              setCall(next)
              chime()
            }
          } catch {
            // Couldn't resolve the match; nothing to announce.
          }
        }
      )
      .subscribe()
    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [activityId, guestId])

  // Move focus to the dismiss button and let Escape close it.
  useEffect(() => {
    if (!call) return
    buttonRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && setCall(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [call])

  if (!call) return null

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="youre-up-title"
      aria-describedby="youre-up-details"
      className="fixed inset-0 z-[90] flex overflow-auto bg-yellow px-[22px] py-6 text-center text-navy-deep"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-1/2 size-0">
          {[0, 1, 2].map((i) => (
            <span key={i} className="cc-call-ring" style={{ animationDelay: `${i}s` }} />
          ))}
        </div>
      </div>

      <div className="relative m-auto flex max-w-[640px] flex-col items-center gap-[clamp(12px,2.4vh,20px)]">
        <div className="font-display text-[18px] font-extrabold uppercase tracking-[.22em]">
          Court call · {call.at}
        </div>
        <h2
          id="youre-up-title"
          className="m-0 font-display text-[clamp(64px,min(22vw,24vh),210px)] font-black uppercase leading-[.86]"
        >
          You’re
          <br />
          up!
        </h2>
        <div className="cc-call-pulse rounded-xl bg-navy-deep px-6 pb-3 pt-2.5 font-display text-[clamp(34px,min(8vw,9vh),68px)] font-black uppercase leading-none text-yellow">
          {call.court}
        </div>
        <p id="youre-up-details" className="m-0 max-w-[420px] text-pretty text-[17px] font-medium leading-normal">
          Head to <b>{call.court}</b> now{call.type ? ` — ${call.type.toLowerCase()}` : ''}.
          {call.partner || call.opponents ? (
            <>
              {' '}
              {call.partner ? (
                <>
                  With <b>{call.partner}</b>
                </>
              ) : (
                'You'
              )}
              {call.opponents ? (
                <>
                  {' '}
                  vs <b>{call.opponents}</b>
                </>
              ) : null}
              .
            </>
          ) : null}
        </p>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setCall(null)}
          className="min-h-[58px] cursor-pointer rounded-full border-none bg-navy-deep px-9 font-display text-[23px] font-black uppercase tracking-[.06em] text-yellow hover:bg-navy focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-navy-deep"
        >
          On my way
        </button>
      </div>
    </div>
  )
}
