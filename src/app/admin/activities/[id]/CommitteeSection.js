'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { clockTime } from '@/lib/format'

const BTN = 'cc-focus inline-flex min-h-10 cursor-pointer items-center justify-center rounded-[10px] px-3.5 text-[14px] font-semibold disabled:cursor-wait disabled:opacity-60'
const BTN_NAVY = `${BTN} border-none bg-navy text-paper hover:bg-navy-deep`
const BTN_OUTLINE = `${BTN} border-[1.5px] border-navy bg-transparent text-navy hover:bg-navy hover:text-paper`
const BTN_QUIET = `${BTN} border-none bg-transparent text-muted underline underline-offset-2 hover:text-ink`

// Runs one committee_assignments write; "no row came back" counts as a failure
// because RLS can filter a write without returning an error.
async function write(query, failMessage) {
  const { data, error } = await query.select()
  if (error) return { error: `${failMessage}: ${error.message}` }
  if (!data?.length) return { error: `${failMessage} — nothing was changed. Refresh and try again.` }
  return { row: data[0] }
}

// Committee members for one activity: assign them, then check them in when
// they arrive. Separate from guest bookings — the committee runs the session.
export default function CommitteeSection({ activityId }) {
  const [people, setPeople] = useState(null) // users with is_committee
  const [assignments, setAssignments] = useState({}) // userId -> committee_assignments row
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(null) // userId being saved
  const [rowError, setRowError] = useState({ id: null, message: '' })

  useEffect(() => {
    let active = true
    async function load() {
      const [peopleRes, assignedRes] = await Promise.all([
        supabase.from('users').select('id, name, nrp, class_level').eq('is_committee', true).order('name'),
        supabase.from('committee_assignments').select('*').eq('activity_id', activityId),
      ])
      if (!active) return
      const problem = peopleRes.error || assignedRes.error
      if (problem) {
        setLoadError(`Couldn’t load the committee: ${problem.message}`)
        return
      }
      const byUser = Object.fromEntries((assignedRes.data || []).map((a) => [a.user_id, a]))
      // Someone assigned here who has since left the committee still shows, so
      // their attendance for this activity stays visible.
      const extraIds = Object.keys(byUser).filter((uid) => !(peopleRes.data || []).some((p) => p.id === uid))
      let extra = []
      if (extraIds.length) {
        const { data } = await supabase.from('users').select('id, name, nrp, class_level').in('id', extraIds)
        extra = (data || []).map((p) => ({ ...p, former: true }))
      }
      if (!active) return
      setAssignments(byUser)
      setPeople([...(peopleRes.data || []), ...extra])
    }
    load()
    return () => {
      active = false
    }
  }, [activityId])

  async function run(userId, task) {
    setBusy(userId)
    setRowError({ id: null, message: '' })
    try {
      const { row, error, removed } = await task()
      if (error) setRowError({ id: userId, message: error })
      else if (removed) {
        setAssignments((prev) => {
          const next = { ...prev }
          delete next[userId]
          return next
        })
      } else setAssignments((prev) => ({ ...prev, [userId]: row }))
    } catch (err) {
      setRowError({ id: userId, message: err?.message || 'Couldn’t reach the server. Check your connection and try again.' })
    } finally {
      setBusy(null)
    }
  }

  // One assignment per member and activity: skip the insert if one exists, and
  // if a duplicate slips through (another admin), load the existing row instead.
  const assign = (person) =>
    run(person.id, async () => {
      if (assignments[person.id]) return { row: assignments[person.id] }
      const { data, error } = await supabase
        .from('committee_assignments')
        .insert({ activity_id: activityId, user_id: person.id })
        .select()
      if (error?.code === '23505') {
        const { data: existing } = await supabase
          .from('committee_assignments')
          .select('*')
          .eq('activity_id', activityId)
          .eq('user_id', person.id)
          .maybeSingle()
        return existing ? { row: existing } : { error: `Couldn’t assign ${person.name}: ${error.message}` }
      }
      if (error) return { error: `Couldn’t assign ${person.name}: ${error.message}` }
      if (!data?.length) return { error: `Couldn’t assign ${person.name} — nothing was saved.` }
      return { row: data[0] }
    })

  const setAttended = (person, attended) =>
    run(person.id, () =>
      write(
        supabase
          .from('committee_assignments')
          .update({ attended, checked_in_at: attended ? new Date().toISOString() : null })
          .eq('id', assignments[person.id].id),
        attended ? `Couldn’t check in ${person.name}` : `Couldn’t undo the check-in`
      )
    )

  const unassign = (person) =>
    run(person.id, async () => {
      const result = await write(
        supabase.from('committee_assignments').delete().eq('id', assignments[person.id].id),
        `Couldn’t unassign ${person.name}`
      )
      return result.error ? result : { removed: true }
    })

  const list = people || []
  const assignedCount = list.filter((p) => assignments[p.id]).length
  const attendedCount = list.filter((p) => assignments[p.id]?.attended).length

  return (
    <section aria-labelledby="committee-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
        <h2 id="committee-heading" className="m-0 font-display text-[34px] font-black uppercase leading-none">
          Committee
        </h2>
        {people?.length ? (
          <div className="text-[14px] text-muted">
            {assignedCount} assigned · {attendedCount} checked in
          </div>
        ) : null}
      </div>

      {loadError ? (
        <div role="alert" className="cc-alert">
          {loadError}
        </div>
      ) : people === null ? (
        <div role="status" className="text-[14px] text-muted">
          Loading the committee…
        </div>
      ) : people.length === 0 ? (
        <div className="cc-empty">
          <div className="cc-empty-title">No committee members</div>
          <div className="mt-1 text-[15px] text-muted">Switch on “Committee” for people on the Members page to assign them here.</div>
        </div>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-px overflow-hidden rounded-2xl border border-line bg-line-soft p-0">
          {list.map((p) => {
            const a = assignments[p.id]
            const saving = busy === p.id
            return (
              <li key={p.id} className="flex flex-col gap-2 bg-surface px-[18px] py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <div className="min-w-0 flex-[1_1_180px]">
                    <div className="truncate text-[15px] font-semibold">
                      {p.name}
                      {p.former ? <span className="ml-2 text-[12px] font-medium text-muted">(no longer on the committee)</span> : null}
                    </div>
                    <div className="text-[12px] text-muted">
                      {[p.nrp && `NRP ${p.nrp}`, p.class_level && `Class ${p.class_level}`].filter(Boolean).join(' · ') || 'Committee'}
                    </div>
                  </div>

                  {!a ? (
                    <button type="button" onClick={() => assign(p)} disabled={!!busy} className={BTN_OUTLINE}>
                      {saving ? 'Assigning…' : 'Assign to this activity'}
                    </button>
                  ) : a.attended ? (
                    <>
                      <span className="inline-flex shrink-0 items-center rounded-full bg-yellow px-2.5 py-1 font-display text-[13px] font-extrabold uppercase tracking-[.08em] text-navy-deep">
                        Checked in ✓{a.checked_in_at ? ` · ${clockTime(new Date(a.checked_in_at))}` : ''}
                      </span>
                      <button type="button" onClick={() => setAttended(p, false)} disabled={!!busy} className={BTN_QUIET}>
                        {saving ? 'Saving…' : 'Undo'}
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex shrink-0 items-center rounded-full border-[1.5px] border-navy px-2.5 py-1 font-display text-[13px] font-extrabold uppercase tracking-[.08em] text-navy">
                        Assigned
                      </span>
                      <button type="button" onClick={() => setAttended(p, true)} disabled={!!busy} className={BTN_NAVY}>
                        {saving ? 'Saving…' : 'Check in'}
                      </button>
                      <button type="button" onClick={() => unassign(p)} disabled={!!busy} className={BTN_QUIET}>
                        Unassign
                      </button>
                    </>
                  )}
                </div>
                {rowError.id === p.id ? (
                  <div role="alert" className="cc-field-error">
                    {rowError.message}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
