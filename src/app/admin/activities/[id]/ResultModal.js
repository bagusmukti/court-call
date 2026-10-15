'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

// Records a finished match: the winning team and, optionally, a free-text
// score. Submitting
// completes the match and frees the court (submit_match_result).
//   teams: { a: 'Raka & Nadia', b: 'Dimas & Salsa' }
export default function ResultModal({ court, match, teams, onClose, onSaved }) {
  const [score, setScore] = useState('')
  const [winner, setWinner] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState('')
  const scoreRef = useRef(null)

  useEffect(() => {
    scoreRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  async function save(e) {
    e.preventDefault()
    const found = {}
    if (winner !== 'A' && winner !== 'B') found.winner = 'Pick the winning team.'
    setErrors(found)
    setSaveError('')
    if (found.winner) return

    setBusy(true)
    try {
      const { error } = await supabase.rpc('submit_match_result', {
        p_match_id: match.id,
        p_score_summary: score.trim() || null,
        p_winning_team: winner,
      })
      if (error) setSaveError(`Couldn’t save the result: ${error.message}`)
      else onSaved()
    } catch (err) {
      setSaveError(err?.message || 'Couldn’t reach the server. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  const option = (team) => {
    const on = winner === team
    return (
      <label
        className={`flex min-h-[64px] cursor-pointer flex-col justify-center gap-0.5 rounded-xl border-[1.5px] px-4 py-2.5 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-navy ${
          on ? 'border-navy bg-navy text-paper' : errors.winner ? 'border-danger bg-white' : 'border-field bg-white hover:border-navy'
        }`}
      >
        <input
          type="radio"
          name="winner"
          value={team}
          checked={on}
          onChange={() => {
            setWinner(team)
            setErrors((prev) => ({ ...prev, winner: undefined }))
          }}
          className="sr-only"
        />
        <span className={`font-display text-[14px] font-extrabold uppercase tracking-[.12em] ${on ? 'text-yellow' : 'text-navy'}`}>
          Team {team} {on ? '· winner ✓' : ''}
        </span>
        <span className="text-[16px] font-semibold leading-snug">{teams[team.toLowerCase()] || '—'}</span>
      </label>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-navy-deep/60 min-[880px]:items-center min-[880px]:p-6"
      onClick={() => !busy && onClose()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={save}
        noValidate
        className="flex max-h-[94vh] w-full max-w-[560px] flex-col gap-4 overflow-auto rounded-t-[20px] bg-surface px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[22px] min-[880px]:rounded-[20px]"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="result-title" className="m-0 font-display text-[30px] font-black uppercase leading-none">
            Result · {court.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="cc-focus flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-[#E9ECF1] text-[20px] text-ink"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="result-score" className="cc-label">
            Score <span className="font-medium text-muted">(optional)</span>
          </label>
          <input
            ref={scoreRef}
            id="result-score"
            type="text"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="e.g. 21-15, 21-18"
            autoComplete="off"
            className="cc-input"
          />
        </div>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0" aria-describedby={errors.winner ? 'result-winner-error' : undefined}>
          <legend className="cc-label mb-1.5 p-0">Winner</legend>
          <div className="grid gap-2.5 min-[480px]:grid-cols-2">
            {option('A')}
            {option('B')}
          </div>
          {errors.winner ? (
            <span id="result-winner-error" className="cc-field-error">
              {errors.winner}
            </span>
          ) : null}
        </fieldset>

        {saveError ? (
          <div role="alert" className="cc-alert">
            {saveError}
          </div>
        ) : null}

        <button type="submit" disabled={busy} className="cc-btn-primary">
          {busy ? 'Saving…' : `Save result · free ${court.name}`}
        </button>
      </form>
    </div>
  )
}
