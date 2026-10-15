'use client'

import { useParams } from 'next/navigation'
import { useGuest } from '@/lib/guestContext'
import YoureUpAlert from '@/components/YoureUpAlert'

// Every page for one activity (detail, payment, live board) listens for the
// guest being called to a court.
export default function ActivityLayout({ children }) {
  const { id } = useParams()
  const { guest } = useGuest()
  return (
    <>
      {children}
      <YoureUpAlert activityId={id} guestId={guest?.id} />
    </>
  )
}
