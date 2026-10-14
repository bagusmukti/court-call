'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { useAdmin } from '@/lib/adminContext'

const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

const STATUS_BADGE = {
  draft: 'border-[1.5px] border-muted text-muted',
  published: 'bg-[#FBE7A6] text-navy-deep',
  ongoing: 'bg-navy-deep text-paper',
  completed: 'border-[1.5px] border-muted text-muted',
  cancelled: 'border-[1.5px] border-muted text-muted',
}

const PAYMENT_LABEL = { upfront: 'Pay upfront', deferred: 'Pay later' }

const rupiah = (v) => (Number(v) > 0 ? 'Rp ' + Number(v).toLocaleString('id-ID') : 'Free')

function ActivityCard({ activity, onPublished }) {
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState('')
  const start = new Date(activity.start_time)
  const time = start.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':')
  const courts = activity.planned_courts
    ? `${activity.planned_courts} ${activity.planned_courts === 1 ? 'court' : 'courts'} · `
    : ''

  async function publish() {
    setPublishing(true)
    setPublishError('')
    try {
      // .select() so an update that RLS silently filters out (0 rows) is caught too.
      const { data, error } = await supabase
        .from('activities')
        .update({ status: 'published' })
        .eq('id', activity.id)
        .eq('status', 'draft')
        .select('id, status')
      if (error) {
        setPublishError(`Couldn’t publish: ${error.message}`)
      } else if (!data?.length) {
        setPublishError('Couldn’t publish — nothing was updated. It may have changed already; refresh and try again.')
      } else {
        onPublished(data[0])
      }
    } catch (err) {
      setPublishError(err?.message || 'Couldn’t reach the server. Check your connection and try again.')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <li className="flex overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex w-[84px] shrink-0 flex-col items-center justify-center gap-0.5 bg-navy py-4 text-paper">
        <div className="font-display text-[15px] font-extrabold tracking-[.14em] text-yellow">{DOW[start.getDay()]}</div>
        <div className="font-display text-[54px] font-black leading-[.88] tabular-nums">
          {String(start.getDate()).padStart(2, '0')}
        </div>
        <div className="font-display text-[15px] font-extrabold tracking-[.14em] text-yellow">
          {MON[start.getMonth()]}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3 px-[18px] py-4">
        <div className="flex items-start justify-between gap-2.5">
          <div className="break-words font-display text-[27px] font-black uppercase leading-[.95]">{activity.name}</div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 font-display text-[13px] font-extrabold uppercase tracking-[.1em] ${
              STATUS_BADGE[activity.status] || STATUS_BADGE.draft
            }`}
          >
            {activity.status}
          </span>
        </div>
        <div className="text-[14px] leading-normal text-muted">
          {time} · {activity.location}
          <br />
          {courts}
          {activity.max_participants} spots
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <div className="font-display text-[23px] font-black leading-none">{rupiah(activity.fee_amount)}</div>
            <div className="mt-[3px] text-[12px] text-muted">{PAYMENT_LABEL[activity.payment_mode]}</div>
          </div>
          {activity.status === 'draft' ? (
            <button
              type="button"
              onClick={publish}
              disabled={publishing}
              aria-describedby={publishError ? `publish-error-${activity.id}` : undefined}
              className="cc-btn-primary min-h-11 rounded-[10px] px-[18px] text-[18px]"
            >
              {publishing ? 'Publishing…' : 'Publish'}
            </button>
          ) : null}
        </div>
        {publishError ? (
          <div id={`publish-error-${activity.id}`} role="alert" className="cc-field-error">
            {publishError}
          </div>
        ) : null}
      </div>
    </li>
  )
}

export default function AdminDashboard() {
  const admin = useAdmin()
  const firstName = (admin?.name || '').trim().split(/\s+/)[0]
  const [activities, setActivities] = useState(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error } = await supabase
        .from('activities')
        .select('id, name, start_time, location, max_participants, fee_amount, payment_mode, planned_courts, status')
        .order('created_at', { ascending: false })
      if (!active) return
      if (error) setLoadError(`Couldn’t load activities: ${error.message}`)
      else setActivities(data)
    }
    load()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="flex flex-col gap-[22px]">
      <div>
        <div className="cc-eyebrow">Admin desk</div>
        <h1 className="cc-page-title">Dashboard</h1>
      </div>

      <p className="m-0 max-w-[640px] text-pretty text-[16px] leading-normal text-ink-soft">
        {firstName ? `Welcome back, ${firstName}. ` : ''}
        Put a session on the board — it’s saved as a draft until you’re ready to publish it.
      </p>

      <div className="flex max-w-[780px] flex-wrap gap-3.5">
        <Link
          href="/admin/activities/new"
          className="cc-focus flex flex-[1_1_300px] flex-col gap-2 rounded-2xl bg-yellow px-[22px] pb-5 pt-[22px] text-navy-deep no-underline hover:bg-yellow-hover"
        >
          <span className="flex items-center justify-between gap-3 font-display text-[32px] font-black uppercase leading-none">
            <span>Create activity</span>
            <span aria-hidden="true">→</span>
          </span>
          <span className="text-[15px] leading-[1.4]">
            Set the time, venue, spots and fee for a new session.
          </span>
        </Link>
      </div>

      <section aria-labelledby="activities-heading" className="mt-2 flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
          <h2 id="activities-heading" className="m-0 font-display text-[34px] font-black uppercase leading-none">
            Activities
          </h2>
          {activities?.length ? (
            <div className="text-[14px] text-muted">{activities.length} total · newest first</div>
          ) : null}
        </div>

        {loadError ? (
          <div
            role="alert"
            className="rounded-[10px] border-[1.5px] border-danger bg-surface px-3.5 py-3 text-[14px] font-medium leading-snug text-danger"
          >
            {loadError}
          </div>
        ) : activities === null ? (
          <div role="status" className="text-[14px] text-muted">
            Loading activities…
          </div>
        ) : activities.length === 0 ? (
          <div className="rounded-2xl border-[1.5px] border-dashed border-[#AAB6C6] bg-surface px-5 py-[18px]">
            <div className="font-display text-[26px] font-extrabold uppercase leading-none">No activities yet</div>
            <div className="mt-1 text-[15px] text-muted">Create the first one and it will show up here.</div>
          </div>
        ) : (
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,370px),1fr))] gap-4 p-0">
            {activities.map((a) => (
              <ActivityCard
                key={a.id}
                activity={a}
                onPublished={(row) =>
                  setActivities((list) => list.map((x) => (x.id === row.id ? { ...x, status: row.status } : x)))
                }
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
