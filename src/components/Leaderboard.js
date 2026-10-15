'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { initials } from '@/components/AppShell'

const PODIUM_BG = ['bg-navy-deep', 'bg-navy', 'bg-[#2A5675]']

const pad = (n) => String(n ?? '–').padStart(2, '0')
const classLabel = (level) => (level ? `Class ${level}` : 'Class not set')
const sessions = (n) => `${n === 1 ? 'session' : 'sessions'}`

const youPill = (
  <span className="shrink-0 rounded-full bg-navy-deep px-[9px] py-[3px] font-display text-[13px] font-black tracking-[.12em] text-paper">
    YOU
  </span>
)

function Podium({ rows, meId }) {
  return (
    <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-3.5 p-0">
      {rows.map((r, i) => {
        const me = r.user_id === meId
        return (
          <li
            key={r.user_id}
            id={me ? 'leaderboard-me' : undefined}
            className={`flex scroll-mt-24 flex-col gap-3.5 rounded-2xl px-5 pb-5 pt-[18px] text-paper ${PODIUM_BG[i]} ${
              me ? 'outline-3 outline-offset-2 outline-yellow' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-2.5">
              <div className="font-display text-[64px] font-black leading-[.8] text-yellow tabular-nums">{pad(r.rank)}</div>
              <div className="text-right">
                <div className="font-display text-[46px] font-black leading-[.85] tabular-nums">{r.attendance_count}</div>
                <div className="text-[12px] text-paper/70">{sessions(r.attendance_count)}</div>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <div className="min-w-0 break-words font-display text-[26px] font-extrabold uppercase leading-none">{r.name}</div>
                {me ? (
                  <span className="shrink-0 rounded-full bg-yellow px-[9px] py-[3px] font-display text-[13px] font-black tracking-[.12em] text-navy-deep">
                    YOU
                  </span>
                ) : null}
              </div>
              <div className="mt-1 text-[13px] text-paper/70">{classLabel(r.class_level)}</div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function RankList({ rows, meId, start }) {
  return (
    <ol start={start} className="m-0 flex list-none flex-col gap-px overflow-hidden rounded-2xl border border-line bg-line-soft p-0">
      {rows.map((r) => {
        const me = r.user_id === meId
        return (
          <li
            key={r.user_id}
            id={me ? 'leaderboard-me' : undefined}
            className={`flex min-h-[52px] scroll-mt-24 items-center gap-3 px-3.5 py-2.5 min-[480px]:gap-4 min-[480px]:px-[18px] ${
              me ? 'bg-[#FBE7A6]' : 'bg-surface'
            }`}
          >
            <div className={`w-8 shrink-0 font-display text-[22px] font-black tabular-nums ${me ? 'text-navy-deep' : 'text-muted'}`}>
              {pad(r.rank)}
            </div>
            <div
              aria-hidden="true"
              className={`flex size-9 shrink-0 items-center justify-center rounded-full font-display text-[15px] font-black text-navy-deep ${
                me ? 'bg-yellow' : 'bg-line-soft'
              }`}
            >
              {initials(r.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-[15px] font-semibold">{r.name}</span>
                {me ? youPill : null}
              </div>
              <div className={`text-[12px] ${me ? 'text-navy-deep' : 'text-muted'}`}>{classLabel(r.class_level)}</div>
            </div>
            <div className="flex shrink-0 items-baseline justify-end gap-[5px] text-right">
              <span className="font-display text-[26px] font-black leading-none tabular-nums">{r.attendance_count}</span>
              <span className={`text-[12px] ${me ? 'text-navy-deep' : 'text-muted'}`}>{sessions(r.attendance_count)}</span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// All-time attendance leaderboard (get_leaderboard), in the design's style:
// podium cards for the top three, then a ranked list. Pass meId to highlight
// the viewer's own row and offer a jump to it.
export default function Leaderboard({ meId }) {
  const [state, setState] = useState({ rows: null, error: '' })

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error } = await supabase.rpc('get_leaderboard')
      if (!active) return
      if (error) setState({ rows: null, error: `Couldn’t load the leaderboard: ${error.message}` })
      else setState({ rows: data || [], error: '' })
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const { rows, error } = state
  const me = meId && rows ? rows.find((r) => r.user_id === meId) : null

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3.5">
        <div>
          <div className="cc-eyebrow">Ranked by attendance, not wins</div>
          <h1 className="cc-page-title">Leaderboard</h1>
        </div>
        {rows?.length ? <div className="text-[14px] text-muted">{rows.length} players · all time</div> : null}
      </div>
      <p className="m-0 -mt-1.5 max-w-[640px] text-pretty text-[16px] leading-normal text-ink-soft">
        Showing up is the whole game. Every session you play counts the same — whether you won 21–5 or picked up a racket
        for the first time.
      </p>

      {meId && rows ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border-[1.5px] border-navy bg-surface px-5 py-4">
          <div className="min-w-[56px] font-display text-[44px] font-black leading-[.9] text-navy tabular-nums">
            {me ? `#${me.rank}` : '—'}
          </div>
          <div className="min-w-0 flex-[1_1_220px]">
            <div className="text-[16px] font-bold">You{me ? ` · ${me.name}` : ''}</div>
            <div className="text-[14px] text-muted">
              {me
                ? me.attendance_count
                  ? `${me.attendance_count} ${sessions(me.attendance_count)} so far.`
                  : 'No sessions yet — your first one puts you on the board.'
                : 'You’re not on the board yet — play a session to get ranked.'}
            </div>
          </div>
          {me ? (
            <a href="#leaderboard-me" className="cc-focus rounded-md text-[14px] font-semibold">
              Show my row ↓
            </a>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="cc-alert">
          {error}
        </div>
      ) : rows === null ? (
        <div role="status" className="text-[14px] text-muted">
          Loading the leaderboard…
        </div>
      ) : rows.length === 0 ? (
        <div className="cc-empty">
          <div className="cc-empty-title">No one on the board yet</div>
          <div className="mt-1 text-[15px] text-muted">Rankings appear once players start attending sessions.</div>
        </div>
      ) : (
        <>
          <Podium rows={rows.slice(0, 3)} meId={meId} />
          {rows.length > 3 ? <RankList rows={rows.slice(3)} meId={meId} start={4} /> : null}
        </>
      )}
    </div>
  )
}
