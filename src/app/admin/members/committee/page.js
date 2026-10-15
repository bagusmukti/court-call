'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import MembersTabs from '../MembersTabs'

const rateOf = (r) => (Number(r.total_assignments) > 0 ? Number(r.attended_count) / Number(r.total_assignments) : null)
const byName = (a, b) => String(a.name).localeCompare(String(b.name))

const SORTS = {
  name: { label: 'Name (A–Z)', fn: byName },
  rateLow: { label: 'Lowest attendance first', fn: (a, b) => (rateOf(a) ?? 2) - (rateOf(b) ?? 2) || byName(a, b) },
  rateHigh: { label: 'Highest attendance first', fn: (a, b) => (rateOf(b) ?? -1) - (rateOf(a) ?? -1) || byName(a, b) },
  assignments: { label: 'Most assignments', fn: (a, b) => Number(b.total_assignments) - Number(a.total_assignments) || byName(a, b) },
}

// Colour bands for the attendance rate: 80%+ navy, 50–79% dark amber, below 50% red.
const tone = (rate) => (rate === null ? 'text-muted' : rate >= 0.8 ? 'text-navy' : rate >= 0.5 ? 'text-amber' : 'text-danger')
const barTone = (rate) => (rate >= 0.8 ? 'bg-navy' : rate >= 0.5 ? 'bg-amber' : 'bg-danger')

// All-time committee attendance (get_committee_attendance_report).
export default function CommitteeDataPage() {
  const [state, setState] = useState({ rows: null, error: '' })
  const [sort, setSort] = useState('name')

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error } = await supabase.rpc('get_committee_attendance_report')
      if (!active) return
      if (error) setState({ rows: null, error: `Couldn’t load committee data: ${error.message}` })
      else setState({ rows: data || [], error: '' })
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const { rows, error } = state
  const shown = useMemo(() => (rows || []).slice().sort(SORTS[sort].fn), [rows, sort])
  const totals = useMemo(
    () =>
      (rows || []).reduce(
        (t, r) => ({ assigned: t.assigned + Number(r.total_assignments || 0), attended: t.attended + Number(r.attended_count || 0) }),
        { assigned: 0, attended: 0 }
      ),
    [rows]
  )
  const overall = totals.assigned ? totals.attended / totals.assigned : null

  return (
    <div className="flex flex-col gap-[22px]">
      <MembersTabs />
      <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-2">
        <div>
          <div className="cc-eyebrow">Running the sessions</div>
          <h1 className="cc-page-title">Committee data</h1>
        </div>
        {rows?.length ? (
          <div className="text-[14px] text-muted">
            {rows.length} committee {rows.length === 1 ? 'member' : 'members'} · all time
          </div>
        ) : null}
      </div>

      {error ? (
        <div role="alert" className="cc-alert">
          {error}
        </div>
      ) : rows === null ? (
        <div role="status" className="text-[14px] text-muted">
          Loading committee data…
        </div>
      ) : rows.length === 0 ? (
        <div className="cc-empty">
          <div className="cc-empty-title">No committee members yet</div>
          <div className="mt-1 text-[15px] text-muted">
            Switch on “Committee” for people on the Guests tab, then assign them to activities.
          </div>
        </div>
      ) : (
        <>
          <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-3.5 rounded-2xl bg-navy-deep px-5 py-4 text-paper min-[640px]:grid-cols-[repeat(3,auto)_1fr] min-[640px]:gap-x-10">
            {[
              ['Assignments', totals.assigned],
              ['Attended', totals.attended],
              ['Overall rate', overall === null ? '—' : `${Math.round(overall * 100)}%`],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1">
                <dt className="font-display text-[13px] font-extrabold uppercase tracking-[.14em] text-yellow">{label}</dt>
                <dd className="m-0 whitespace-nowrap font-display text-[30px] font-black leading-none tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="flex min-w-[220px] flex-col gap-1.5 self-start">
            <label htmlFor="committee-sort" className="cc-label">
              Sort
            </label>
            <select id="committee-sort" value={sort} onChange={(e) => setSort(e.target.value)} className="cc-input">
              {Object.entries(SORTS).map(([key, s]) => (
                <option key={key} value={key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <ul className="m-0 flex list-none flex-col gap-px overflow-hidden rounded-2xl border border-line bg-line-soft p-0">
            {shown.map((r) => {
              const rate = rateOf(r)
              const pct = rate === null ? null : Math.round(rate * 100)
              return (
                <li key={r.user_id} className="flex flex-wrap items-center gap-x-5 gap-y-2.5 bg-surface px-[18px] py-3.5">
                  <div className="min-w-0 flex-[1_1_180px]">
                    <div className="truncate text-[15px] font-semibold">{r.name}</div>
                    <div className="text-[12px] text-muted">{r.class_level ? `Class ${r.class_level}` : 'Class not set'}</div>
                  </div>
                  <div className="flex flex-[1_1_220px] items-center gap-3.5">
                    <div className="h-2 min-w-[80px] flex-1 overflow-hidden rounded-full bg-line-soft" aria-hidden="true">
                      {pct !== null ? <div className={`h-full rounded-full ${barTone(rate)}`} style={{ width: `${pct}%` }} /> : null}
                    </div>
                    <div className="flex shrink-0 items-baseline gap-2 text-right">
                      <span className="font-display text-[24px] font-black leading-none tabular-nums">
                        {Number(r.attended_count) || 0}/{Number(r.total_assignments) || 0}
                      </span>
                      <span className={`w-[54px] font-display text-[20px] font-black leading-none tabular-nums ${tone(rate)}`}>
                        {pct === null ? '—' : `${pct}%`}
                      </span>
                    </div>
                  </div>
                  <span className="sr-only">
                    {pct === null
                      ? 'No assignments yet.'
                      : `Attended ${r.attended_count} of ${r.total_assignments} assignments, ${pct} percent.`}
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
