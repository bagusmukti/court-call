'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useGuest } from '@/lib/guestContext'
import ActivityCard from '@/components/ActivityCard'

const bookedBadge = (
  <span className="shrink-0 rounded-full bg-[#FBE7A6] px-2.5 py-1 font-display text-[13px] font-extrabold tracking-[.1em] text-navy-deep">
    BOOKED ✓
  </span>
)

export default function ActivitiesPage() {
  const { guest, bookings, loadBookings } = useGuest()
  const [activities, setActivities] = useState(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('status', 'published')
        .order('start_time', { ascending: true })
      if (!active) return
      if (error) setLoadError(`Couldn’t load activities: ${error.message}`)
      else setActivities(data)
    }
    load()
    return () => {
      active = false
    }
  }, [])

  // Re-check bookings with Supabase whenever this page opens.
  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  const firstName = guest.name.trim().split(/\s+/)[0]

  return (
    <div className="flex flex-col gap-[22px]">
      <div>
        <div className="cc-eyebrow">Upcoming on court</div>
        <h1 className="cc-page-title">Activities</h1>
      </div>

      <p className="m-0 max-w-[640px] text-pretty text-[16px] leading-normal text-ink-soft">
        Hi {firstName} — pick a session to join.
      </p>

      {loadError ? (
        <div role="alert" className="cc-alert">
          {loadError}
        </div>
      ) : activities === null ? (
        <div role="status" className="text-[14px] text-muted">
          Loading activities…
        </div>
      ) : activities.length === 0 ? (
        <div className="cc-empty">
          <div className="cc-empty-title">No sessions on the board yet</div>
          <div className="mt-1 text-[15px] text-muted">Check back soon — new sessions show up here as soon as they’re published.</div>
        </div>
      ) : (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,370px),1fr))] gap-4 p-0">
          {activities.map((a) => (
            <ActivityCard
              key={a.id}
              activity={a}
              href={`/activities/${a.id}`}
              badge={bookings[a.id] ? bookedBadge : null}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
