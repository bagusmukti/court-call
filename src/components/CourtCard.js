import CourtStatusBadge from '@/components/CourtStatusBadge'

// Badminton doubles court markings, as percentages of a 13.4 m × 6.1 m court.
const LINE = 'absolute border-paper/70'

// Where players stand on the drawing (from the design): team A on the left half,
// team B on the right.
const SPOTS = {
  1: { a: [{ x: '25%', y: '50%' }], b: [{ x: '75%', y: '50%' }] },
  2: {
    a: [
      { x: '21%', y: '27%' },
      { x: '31%', y: '73%' },
    ],
    b: [
      { x: '69%', y: '27%' },
      { x: '79%', y: '73%' },
    ],
  },
}

const initial = (name) => (name || '?').trim().charAt(0).toUpperCase()

function Player({ player, spot }) {
  return (
    <div
      className="absolute z-[2] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[3px]"
      style={{ left: spot.x, top: spot.y }}
    >
      <div
        className={`flex size-8 items-center justify-center rounded-full font-display text-[15px] font-black text-navy-deep shadow-[0_2px_0_rgba(10,30,79,.4)] ${
          player.me ? 'bg-yellow' : 'bg-paper'
        }`}
      >
        {initial(player.name)}
      </div>
      <div className="max-w-[90px] truncate rounded bg-navy-deep/70 px-1.5 py-px text-[11px] font-semibold leading-tight text-paper">
        {player.me ? 'You' : player.name}
      </div>
    </div>
  )
}

function CourtDrawing({ label, teams }) {
  const perSide = teams ? Math.max(teams.a.length, teams.b.length) : 0
  const spots = SPOTS[perSide] || null
  return (
    <div className="rounded-[10px] bg-[#12317A] px-[4.5%] py-[5.5%]" aria-hidden="true">
      <div className="relative aspect-[13.4/6.1] bg-[#24589A]">
        <div className="absolute inset-0 border-2 border-paper/90" />
        <div className={`${LINE} inset-x-0 top-[7.54%] border-t-[1.5px]`} />
        <div className={`${LINE} inset-x-0 top-[92.46%] border-t-[1.5px]`} />
        <div className={`${LINE} inset-y-0 left-[5.67%] border-l-[1.5px]`} />
        <div className={`${LINE} inset-y-0 left-[94.33%] border-l-[1.5px]`} />
        <div className={`${LINE} inset-y-0 left-[35.22%] border-l-[1.5px]`} />
        <div className={`${LINE} inset-y-0 left-[64.78%] border-l-[1.5px]`} />
        <div className={`${LINE} left-0 top-1/2 w-[35.22%] border-t-[1.5px]`} />
        <div className={`${LINE} left-[64.78%] right-0 top-1/2 border-t-[1.5px]`} />
        <div className="absolute -bottom-[8%] -top-[8%] left-1/2 -ml-[1.5px] border-l-[3px] border-dotted border-yellow" />
        {spots ? (
          <>
            {teams.a.map((p, i) => spots.a[i] && <Player key={p.id} player={p} spot={spots.a[i]} />)}
            {teams.b.map((p, i) => spots.b[i] && <Player key={p.id} player={p} spot={spots.b[i]} />)}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-md bg-navy-deep/80 px-3 py-1.5 font-display text-[16px] font-extrabold uppercase tracking-[.08em] text-paper">
              {label}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

const teamLabel = (team) => team.map((p) => (p.me ? 'You' : p.name)).join(' & ')

// The design's court card from the live board.
//   teams: { a: [{ id, name, me }], b: [...] } while a match is on, else null
export default function CourtCard({ court, teams }) {
  const inUse = court.status === 'in_use'
  const playing = inUse && teams && teams.a.length + teams.b.length > 0
  const mine = playing && [...teams.a, ...teams.b].some((p) => p.me)
  const summary = playing ? `${teamLabel(teams.a)} versus ${teamLabel(teams.b)}` : inUse ? 'in use' : court.status === 'idle' ? 'open' : court.status

  return (
    <li
      className={`flex flex-col overflow-hidden rounded-2xl border-[1.5px] bg-surface ${
        mine ? 'border-yellow' : inUse ? 'border-navy' : 'border-line'
      }`}
      aria-label={`${court.name}: ${summary}`}
    >
      <div className="flex items-center justify-between gap-2.5 pb-2.5 pl-4 pr-3.5 pt-3">
        <div className="min-w-0 truncate font-display text-[30px] font-black uppercase leading-none">{court.name}</div>
        <CourtStatusBadge status={court.status} />
      </div>
      <div className="px-3">
        <CourtDrawing label={inUse ? 'Game on' : 'Waiting for next four'} teams={playing ? teams : null} />
      </div>
      <div className="flex flex-col gap-2.5 px-4 pb-4 pt-3">
        {playing ? (
          <div className="flex items-center gap-2.5 text-[14px] font-semibold leading-snug">
            <span className="min-w-0 flex-1">{teamLabel(teams.a)}</span>
            <span className="font-display text-[14px] font-extrabold tracking-[.1em] text-muted">VS</span>
            <span className="min-w-0 flex-1 text-right">{teamLabel(teams.b)}</span>
          </div>
        ) : (
          <div className="text-[14px] text-muted">
            {inUse ? 'A game is being played on this court.' : 'Free — the desk calls the next four from the queue.'}
          </div>
        )}
        {mine ? (
          <span className="self-start rounded-full bg-yellow px-[11px] py-[5px] font-display text-[15px] font-extrabold uppercase tracking-[.08em] text-navy-deep">
            You’re on this court
          </span>
        ) : null}
      </div>
    </li>
  )
}
