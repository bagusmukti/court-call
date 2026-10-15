import { clockTime } from '@/lib/format'

const winnerOf = (value) => String(value || '').trim().toUpperCase()

function Team({ names, won, decided, align }) {
  return (
    <div
      className={`min-w-0 text-[15px] ${align === 'right' ? 'text-right' : ''} ${
        won ? 'font-bold text-ink' : decided ? 'font-medium text-disabled' : 'font-semibold text-ink'
      }`}
    >
      {won && align === 'right' ? <span className="mr-1.5 text-navy" aria-hidden="true">✓</span> : null}
      <span className="break-words">{names || '—'}</span>
      {won && align !== 'right' ? <span className="ml-1.5 text-navy" aria-hidden="true">✓</span> : null}
      {won ? <span className="sr-only"> (won)</span> : null}
    </div>
  )
}

// The design's Score log, fed by get_match_history rows (newest first).
export default function MatchHistoryList({ rows, emptyText = 'No matches yet — results show up here as games finish.' }) {
  if (!rows.length) {
    return (
      <div className="cc-empty">
        <div className="cc-empty-title">No matches yet</div>
        <div className="mt-1 text-[15px] text-muted">{emptyText}</div>
      </div>
    )
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-px overflow-hidden rounded-2xl border border-line bg-line-soft p-0">
      {rows.map((m) => {
        const winner = winnerOf(m.winning_team)
        const decided = winner === 'A' || winner === 'B'
        const finished = m.status === 'completed'
        return (
          <li key={m.match_id} className="flex flex-wrap items-center gap-x-[22px] gap-y-2.5 bg-surface px-[18px] py-3.5">
            <div className="flex min-w-[150px] items-center gap-2.5">
              <span className="max-w-[110px] truncate rounded-md bg-navy-deep px-[9px] py-[3px] font-display text-[16px] font-black uppercase tracking-[.04em] text-yellow">
                {m.court_name || 'Court'}
              </span>
              <span className="text-[13px] text-muted tabular-nums">
                {m.started_at ? clockTime(new Date(m.started_at)) : '—'} ·{' '}
                {m.match_type === 'singles' ? 'Singles' : m.match_type === 'doubles' ? 'Doubles' : m.match_type || 'Match'}
              </span>
            </div>

            <div className="grid min-w-0 flex-[1_1_380px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3.5">
              <Team names={m.team_a_names} won={winner === 'A'} decided={decided} align="right" />
              <div className="text-center">
                {!finished ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-navy-deep px-[11px] py-1 font-display text-[14px] font-extrabold uppercase tracking-[.08em] text-yellow">
                    <span className="cc-live-dot" aria-hidden="true" />
                    In play
                  </span>
                ) : m.score_summary ? (
                  <span className="font-display text-[clamp(20px,3vw,28px)] font-black leading-none tabular-nums">
                    {m.score_summary}
                  </span>
                ) : decided ? (
                  <span className="text-[13px] font-medium text-muted">No score</span>
                ) : (
                  <span className="text-[13px] font-medium text-muted">No result recorded</span>
                )}
              </div>
              <Team names={m.team_b_names} won={winner === 'B'} decided={decided} align="left" />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
