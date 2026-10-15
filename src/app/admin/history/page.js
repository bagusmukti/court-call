'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { DOW, MON, PAYMENT_LABEL, clockTime, idr, rupiah } from '@/lib/format'
import ActivityStatusBadge from '@/components/ActivityStatusBadge'

const STATUSES = ['draft', 'published', 'ongoing', 'completed', 'cancelled']
const STATUS_LABEL = { draft: 'Draft', published: 'Published', ongoing: 'Live', completed: 'Completed', cancelled: 'Cancelled' }

const time = (r) => new Date(r.start_time || 0).getTime()
const SORTS = {
  newest: { label: 'Newest first', fn: (a, b) => time(b) - time(a) },
  oldest: { label: 'Oldest first', fn: (a, b) => time(a) - time(b) },
  bookings: { label: 'Most bookings', fn: (a, b) => Number(b.total_bookings) - Number(a.total_bookings) || time(b) - time(a) },
  revenue: { label: 'Most revenue', fn: (a, b) => Number(b.revenue_collected) - Number(a.revenue_collected) || time(b) - time(a) },
}

function Stat({ label, value, tone = '' }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-[11px] font-semibold uppercase tracking-[.08em] text-muted">{label}</dt>
      <dd className={`m-0 whitespace-nowrap font-display text-[24px] font-black leading-none tabular-nums ${tone}`}>{value}</dd>
    </div>
  )
}

function HistoryCard({ row }) {
  const start = new Date(row.start_time)
  const cancelled = row.status === 'cancelled'
  return (
    <li className="flex">
      <Link
        href={`/admin/activities/${row.activity_id}`}
        className="cc-focus flex w-full overflow-hidden rounded-2xl border border-line bg-surface text-ink no-underline transition-colors hover:border-navy"
      >
        <div
          className={`flex w-[76px] shrink-0 flex-col items-center justify-center gap-0.5 py-3.5 text-paper ${
            cancelled ? 'bg-muted' : row.status === 'ongoing' ? 'bg-navy-deep' : 'bg-navy'
          }`}
        >
          <div className="font-display text-[14px] font-extrabold tracking-[.14em] text-yellow">{DOW[start.getDay()]}</div>
          <div className="font-display text-[44px] font-black leading-[.88] tabular-nums">{String(start.getDate()).padStart(2, '0')}</div>
          <div className="font-display text-[14px] font-extrabold tracking-[.14em] text-yellow">{MON[start.getMonth()]}</div>
          <div className="mt-0.5 text-[11px] text-paper/70 tabular-nums">{start.getFullYear()}</div>
        </div>
        <div className="@container flex min-w-0 flex-1 flex-col gap-3 px-[18px] py-3.5">
          <div className="flex items-start justify-between gap-2.5">
            <div className={`min-w-0 break-words font-display text-[24px] font-black uppercase leading-[.95] ${cancelled ? 'text-muted line-through decoration-2' : ''}`}>
              {row.name}
            </div>
            <ActivityStatusBadge status={row.status} />
          </div>
          <div className="text-[14px] leading-normal text-muted">
            {clockTime(start)} · {row.location} · {rupiah(row.fee_amount)}
            {row.payment_mode ? ` · ${PAYMENT_LABEL[row.payment_mode] || row.payment_mode}` : ''}
          </div>
          <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line-soft pt-3 @[480px]:grid-cols-[auto_auto_auto_1fr]">
            <Stat label="Bookings" value={row.total_bookings ?? 0} />
            <Stat label="Checked in" value={row.checked_in_count ?? 0} />
            <Stat label="No-shows" value={row.no_show_count ?? 0} tone={Number(row.no_show_count) > 0 ? 'text-amber' : ''} />
            <Stat label="Revenue" value={idr(row.revenue_collected)} />
          </dl>
        </div>
      </Link>
    </li>
  )
}

// Read-only look back over every activity (get_activity_history).
export default function ActivityHistoryPage() {
  const [state, setState] = useState({ rows: null, error: '' })
  const [status, setStatus] = useState('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('newest')

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error } = await supabase.rpc('get_activity_history')
      if (!active) return
      if (error) setState({ rows: null, error: `Couldn’t load activity history: ${error.message}` })
      else setState({ rows: data || [], error: '' })
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const { rows, error } = state
  const counts = useMemo(() => {
    const out = { all: rows?.length || 0 }
    for (const s of STATUSES) out[s] = (rows || []).filter((r) => r.status === s).length
    return out
  }, [rows])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (rows || [])
      .filter((r) => status === 'all' || r.status === status)
      .filter((r) => !q || String(r.name).toLowerCase().includes(q) || String(r.location).toLowerCase().includes(q))
      .sort(SORTS[sort].fn)
  }, [rows, status, query, sort])

  const totals = useMemo(
    () =>
      shown.reduce(
        (t, r) => ({
          bookings: t.bookings + Number(r.total_bookings || 0),
          checkedIn: t.checkedIn + Number(r.checked_in_count || 0),
          noShows: t.noShows + Number(r.no_show_count || 0),
          revenue: t.revenue + Number(r.revenue_collected || 0),
        }),
        { bookings: 0, checkedIn: 0, noShows: 0, revenue: 0 }
      ),
    [shown]
  )

  return (
    <div className="flex flex-col gap-[22px]">
      <div>
        <div className="cc-eyebrow">Looking back</div>
        <h1 className="cc-page-title">Activity history</h1>
      </div>

      {error ? (
        <div role="alert" className="cc-alert">
          {error}
        </div>
      ) : rows === null ? (
        <div role="status" className="text-[14px] text-muted">
          Loading activity history…
        </div>
      ) : rows.length === 0 ? (
        <div className="cc-empty">
          <div className="cc-empty-title">No activities yet</div>
          <div className="mt-1 text-[15px] text-muted">Activities you create show up here, whatever their status.</div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1.5">
              {['all', ...STATUSES].map((s) => {
                const on = status === s
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    aria-pressed={on}
                    className={`cc-focus inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] px-3.5 font-display text-[15px] font-extrabold uppercase tracking-[.06em] ${
                      on ? 'border-navy-deep bg-navy-deep text-yellow' : 'border-line bg-surface text-ink-soft hover:border-navy'
                    }`}
                  >
                    {s === 'all' ? 'All' : STATUS_LABEL[s]}
                    <span className={`font-sans text-[12px] font-semibold tracking-normal ${on ? 'text-paper/80' : 'text-muted'}`}>
                      {counts[s]}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-2.5">
              <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1.5">
                <label htmlFor="history-search" className="cc-label">
                  Search
                </label>
                <input
                  id="history-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Activity name or location"
                  autoComplete="off"
                  className="cc-input"
                />
              </div>
              <div className="flex min-w-[180px] flex-col gap-1.5">
                <label htmlFor="history-sort" className="cc-label">
                  Sort
                </label>
                <select id="history-sort" value={sort} onChange={(e) => setSort(e.target.value)} className="cc-input">
                  {Object.entries(SORTS).map(([key, s]) => (
                    <option key={key} value={key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <dl
            aria-live="polite"
            className="m-0 grid grid-cols-2 gap-x-5 gap-y-3.5 rounded-2xl bg-navy-deep px-5 py-4 text-paper min-[640px]:grid-cols-[repeat(4,auto)_1fr] min-[640px]:gap-x-9"
          >
            {[
              ['Activities', shown.length],
              ['Bookings', totals.bookings],
              ['Checked in', totals.checkedIn],
              ['No-shows', totals.noShows],
              ['Revenue', idr(totals.revenue)],
            ].map(([label, value]) => (
              <div key={label} className={`flex min-w-0 flex-col gap-1 ${label === 'Revenue' ? 'col-span-2 min-[640px]:col-span-1' : ''}`}>
                <dt className="font-display text-[13px] font-extrabold uppercase tracking-[.14em] text-yellow">{label}</dt>
                <dd className="m-0 whitespace-nowrap font-display text-[30px] font-black leading-none tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>

          {shown.length === 0 ? (
            <div className="cc-empty">
              <div className="cc-empty-title">No matches</div>
              <div className="mt-1 text-[15px] text-muted">No activities fit this filter — try another status or clear the search.</div>
            </div>
          ) : (
            <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,460px),1fr))] gap-4 p-0">
              {shown.map((r) => (
                <HistoryCard key={r.activity_id} row={r} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
