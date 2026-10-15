'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import MembersTabs from './MembersTabs'

const FILTERS = {
  all: { label: 'All', test: () => true },
  members: { label: 'Members', test: (r) => r.is_member },
  guests: { label: 'Non-members', test: (r) => !r.is_member },
  committee: { label: 'Committee', test: (r) => r.is_committee },
  noshows: { label: 'Has no-shows', test: (r) => Number(r.no_show_count) > 0 },
}

const byName = (a, b) => String(a.name).localeCompare(String(b.name))
const SORTS = {
  name: { label: 'Name', fn: byName },
  attendance: { label: 'Attendance', fn: (a, b) => Number(b.attendance_count) - Number(a.attendance_count) || byName(a, b) },
  noshows: { label: 'No-shows', fn: (a, b) => Number(b.no_show_count) - Number(a.no_show_count) || byName(a, b) },
}

const waLink = (number) => {
  const digits = String(number || '').replace(/\D/g, '').replace(/^0/, '62')
  return digits ? `https://wa.me/${digits}` : null
}

// No-shows: plain at 0, dark amber at 1–2, a red pill from 3 up.
function NoShows({ count }) {
  const n = Number(count) || 0
  if (n >= 3) {
    return (
      <span className="inline-flex items-center rounded-full border-[1.5px] border-danger px-2.5 py-0.5 font-display text-[18px] font-black leading-tight text-danger tabular-nums">
        {n}
        <span className="sr-only"> no-shows — repeat</span>
      </span>
    )
  }
  return (
    <span className={`font-display text-[22px] font-black leading-none tabular-nums ${n > 0 ? 'text-amber' : 'text-muted'}`}>{n}</span>
  )
}

// Yes/no switch for one users column (is_member, is_committee).
function FlagSwitch({ row, field, label, onText, offText, pending, onToggle }) {
  const on = !!row[field]
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${label}: ${row.name}`}
      onClick={() => onToggle(row, field)}
      disabled={pending}
      className="cc-focus group inline-flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 disabled:cursor-wait"
    >
      <span
        aria-hidden="true"
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
          on ? 'bg-navy' : 'bg-field'
        } ${pending ? 'opacity-60' : ''}`}
      >
        <span
          className={`absolute left-1 size-5 rounded-full shadow-[0_1px_2px_rgba(10,30,79,.3)] transition-transform ${
            on ? 'translate-x-5 bg-yellow' : 'bg-white'
          }`}
        />
      </span>
      <span className={`w-[72px] text-left text-[13px] font-semibold ${on ? 'text-navy' : 'text-muted'}`}>
        {on ? onText : offText}
      </span>
    </button>
  )
}

const SWITCHES = {
  is_member: { label: 'Member', onText: 'Member', offText: 'Guest' },
  is_committee: { label: 'Committee', onText: 'Committee', offText: 'No' },
}

function SortHeader({ sortKey, sort, setSort, children, align = 'left' }) {
  const on = sort === sortKey
  return (
    <th scope="col" aria-sort={on ? (sortKey === 'name' ? 'ascending' : 'descending') : 'none'} className={`px-3 py-2.5 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        type="button"
        onClick={() => setSort(sortKey)}
        className={`cc-focus inline-flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-[12px] font-semibold uppercase tracking-[.08em] ${
          on ? 'text-navy' : 'text-muted hover:text-ink'
        }`}
      >
        {children}
        <span aria-hidden="true">{on ? (sortKey === 'name' ? '↑' : '↓') : '↕'}</span>
      </button>
    </th>
  )
}

const TH = 'px-3 py-2.5 text-left text-[12px] font-semibold uppercase tracking-[.08em] text-muted'

// Every guest, with Member / Committee switches and their attendance and
// no-show counts.
export default function MembersPage() {
  const [state, setState] = useState({ rows: null, error: '' })
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('name')
  const [pending, setPending] = useState({}) // 'userId:field' -> true while saving
  const [rowErrors, setRowErrors] = useState({}) // userId -> message

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error } = await supabase.rpc('get_member_directory')
      if (!active) return
      if (error) setState({ rows: null, error: `Couldn’t load members: ${error.message}` })
      else setState({ rows: data || [], error: '' })
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const setFlag = (userId, field, value) =>
    setState((s) => ({ ...s, rows: s.rows.map((r) => (r.user_id === userId ? { ...r, [field]: value } : r)) }))

  // Optimistic: flip straight away, put it back if the update fails or RLS
  // filters it out (no row returned).
  async function toggle(row, field) {
    const next = !row[field]
    const key = `${row.user_id}:${field}`
    setFlag(row.user_id, field, next)
    setPending((p) => ({ ...p, [key]: true }))
    setRowErrors((e) => ({ ...e, [row.user_id]: '' }))
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ [field]: next })
        .eq('id', row.user_id)
        .select(`id, ${field}`)
      if (error || !data?.length) {
        setFlag(row.user_id, field, !next)
        setRowErrors((e) => ({
          ...e,
          [row.user_id]: error ? `Couldn’t update ${SWITCHES[field].label.toLowerCase()}: ${error.message}` : 'Couldn’t update — nothing was changed.',
        }))
      }
    } catch (err) {
      setFlag(row.user_id, field, !next)
      setRowErrors((e) => ({ ...e, [row.user_id]: err?.message || 'Couldn’t reach the server.' }))
    } finally {
      setPending((p) => ({ ...p, [key]: false }))
    }
  }

  const flag = (r, field) => (
    <FlagSwitch row={r} field={field} {...SWITCHES[field]} pending={!!pending[`${r.user_id}:${field}`]} onToggle={toggle} />
  )

  const { rows, error } = state
  const counts = useMemo(
    () => Object.fromEntries(Object.entries(FILTERS).map(([k, f]) => [k, (rows || []).filter(f.test).length])),
    [rows]
  )
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (rows || [])
      .filter(FILTERS[filter].test)
      .filter((r) => !q || String(r.name).toLowerCase().includes(q) || String(r.nrp || '').toLowerCase().includes(q))
      .sort(SORTS[sort].fn)
  }, [rows, filter, query, sort])

  const contact = (r) => {
    const link = waLink(r.whatsapp_number)
    return link ? (
      <a href={link} target="_blank" rel="noopener noreferrer" className="font-medium tabular-nums">
        {r.whatsapp_number}
      </a>
    ) : (
      <span className="text-muted">—</span>
    )
  }
  const classText = (r) => (r.class_level ? `Class ${r.class_level}` : '—')
  const rowError = (r) =>
    rowErrors[r.user_id] ? (
      <span role="alert" className="cc-field-error">
        {rowErrors[r.user_id]}
      </span>
    ) : null

  return (
    <div className="flex flex-col gap-[22px]">
      <MembersTabs />
      <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-2">
        <div>
          <div className="cc-eyebrow">Admin desk</div>
          <h1 className="cc-page-title">Members</h1>
        </div>
        {rows?.length ? (
          <div className="text-[14px] text-muted">
            {rows.length} guests · {counts.members} members · {counts.committee} committee · {counts.noshows} with no-shows
          </div>
        ) : null}
      </div>

      {error ? (
        <div role="alert" className="cc-alert">
          {error}
        </div>
      ) : rows === null ? (
        <div role="status" className="text-[14px] text-muted">
          Loading members…
        </div>
      ) : rows.length === 0 ? (
        <div className="cc-empty">
          <div className="cc-empty-title">No guests yet</div>
          <div className="mt-1 text-[15px] text-muted">Everyone who checks in as a guest shows up here.</div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <div role="group" aria-label="Filter" className="flex flex-wrap gap-1.5">
              {Object.entries(FILTERS).map(([key, f]) => {
                const on = filter === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    aria-pressed={on}
                    className={`cc-focus inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] px-3.5 font-display text-[15px] font-extrabold uppercase tracking-[.06em] ${
                      on ? 'border-navy-deep bg-navy-deep text-yellow' : 'border-line bg-surface text-ink-soft hover:border-navy'
                    }`}
                  >
                    {f.label}
                    <span className={`font-sans text-[12px] font-semibold tracking-normal ${on ? 'text-paper/80' : 'text-muted'}`}>
                      {counts[key]}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-2.5">
              <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1.5">
                <label htmlFor="member-search" className="cc-label">
                  Search
                </label>
                <input
                  id="member-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Name or NRP"
                  autoComplete="off"
                  className="cc-input"
                />
              </div>
              {/* The table headers sort on desktop; phones get this menu. */}
              <div className="flex min-w-[170px] flex-col gap-1.5 min-[880px]:hidden">
                <label htmlFor="member-sort" className="cc-label">
                  Sort
                </label>
                <select id="member-sort" value={sort} onChange={(e) => setSort(e.target.value)} className="cc-input">
                  <option value="name">Name (A–Z)</option>
                  <option value="attendance">Most attendance</option>
                  <option value="noshows">Most no-shows</option>
                </select>
              </div>
            </div>
          </div>

          {shown.length === 0 ? (
            <div className="cc-empty">
              <div className="cc-empty-title">No matches</div>
              <div className="mt-1 text-[15px] text-muted">No one fits this filter — try another one or clear the search.</div>
            </div>
          ) : (
            <>
              {/* Desktop: table */}
              <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface min-[880px]:block">
                <table className="w-full border-collapse">
                  <caption className="sr-only">Guests, sorted by {SORTS[sort].label.toLowerCase()}</caption>
                  <thead className="border-b border-line bg-[#EEF1F5]">
                    <tr>
                      <SortHeader sortKey="name" sort={sort} setSort={setSort}>
                        Name
                      </SortHeader>
                      <th scope="col" className={TH}>NRP</th>
                      <th scope="col" className={TH}>WhatsApp</th>
                      <th scope="col" className={TH}>Class</th>
                      <SortHeader sortKey="attendance" sort={sort} setSort={setSort} align="right">
                        Attended
                      </SortHeader>
                      <SortHeader sortKey="noshows" sort={sort} setSort={setSort} align="right">
                        No-shows
                      </SortHeader>
                      <th scope="col" className={TH}>Member</th>
                      <th scope="col" className={TH}>Committee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((r) => (
                      <tr key={r.user_id} className="border-b border-line-soft last:border-b-0">
                        <td className="px-3 py-2.5 align-middle">
                          <span className="text-[15px] font-semibold">{r.name}</span>
                          {rowError(r)}
                        </td>
                        <td className="px-3 py-2.5 text-[14px] tabular-nums">{r.nrp || <span className="text-muted">—</span>}</td>
                        <td className="px-3 py-2.5 text-[14px]">{contact(r)}</td>
                        <td className="px-3 py-2.5 text-[14px]">{classText(r)}</td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="font-display text-[22px] font-black leading-none tabular-nums">{r.attendance_count ?? 0}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <NoShows count={r.no_show_count} />
                        </td>
                        <td className="px-3 py-2.5">{flag(r, 'is_member')}</td>
                        <td className="px-3 py-2.5">{flag(r, 'is_committee')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Phones / tablets: cards */}
              <ul className="m-0 flex list-none flex-col gap-px overflow-hidden rounded-2xl border border-line bg-line-soft p-0 min-[880px]:hidden">
                {shown.map((r) => (
                  <li key={r.user_id} className="flex flex-col gap-2.5 bg-surface px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[15px] font-semibold">{r.name}</span>
                        <div className="text-[13px] text-muted">
                          {r.nrp ? `NRP ${r.nrp}` : 'No NRP'} · {classText(r)}
                        </div>
                        {r.whatsapp_number ? <div className="text-[13px]">{contact(r)}</div> : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-start gap-2">
                        {flag(r, 'is_member')}
                        {flag(r, 'is_committee')}
                      </div>
                    </div>
                    <dl className="m-0 flex gap-6">
                      <div className="flex items-baseline gap-1.5">
                        <dd className="m-0 font-display text-[22px] font-black leading-none tabular-nums">{r.attendance_count ?? 0}</dd>
                        <dt className="text-[12px] text-muted">attended</dt>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <dd className="m-0">
                          <NoShows count={r.no_show_count} />
                        </dd>
                        <dt className="text-[12px] text-muted">no-shows</dt>
                      </div>
                    </dl>
                    {rowError(r)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  )
}
