'use client'

import { useParams } from 'next/navigation'
import { useGuest } from '@/lib/guestContext'
import { useActivity } from '@/lib/useActivity'
import { useLiveRows } from '@/lib/useLiveRows'
import { useMatchHistory, useMatchRecord } from '@/lib/useMatchHistory'
import BackLink from '@/components/BackLink'
import LiveTabs from '@/components/LiveTabs'
import MatchHistoryList from '@/components/MatchHistoryList'
import RecordChip from '@/components/RecordChip'

// Read-only match history for one activity, newest first. Refreshes live as
// matches start and finish.
export default function MatchHistoryPage() {
  const { id } = useParams()
  const { guest } = useGuest()
  const { activity, error: activityError } = useActivity(id)
  const matchesLive = useLiveRows('matches', id)
  const versionKey = (matchesLive.rows || [])
    .map((m) => `${m.id}:${m.status}`)
    .sort()
    .join(',')
  const history = useMatchHistory(id, versionKey)
  const record = useMatchRecord(guest.id, versionKey)

  if (activityError) {
    return (
      <div className="flex flex-col gap-[18px]">
        <BackLink />
        <div role="alert" className="cc-alert">
          {activityError}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <BackLink href={`/activities/${id}`}>← Back to the session</BackLink>
      <LiveTabs activityId={id} aside={<RecordChip record={record} />} />

      <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-2.5">
        <div>
          <div className="cc-eyebrow">{activity ? activity.name : 'Session'}</div>
          <h1 className="cc-page-title">Match history</h1>
        </div>
        {history.rows?.length ? (
          <div className="text-[14px] text-muted">
            {history.rows.length} {history.rows.length === 1 ? 'match' : 'matches'} · newest first
          </div>
        ) : null}
      </div>

      {history.error ? (
        <div role="alert" className="cc-alert">
          {history.error}
        </div>
      ) : history.rows === null ? (
        <div role="status" className="text-[14px] text-muted">
          Loading match history…
        </div>
      ) : (
        <MatchHistoryList rows={history.rows} />
      )}
    </div>
  )
}
