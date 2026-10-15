'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGuest } from '@/lib/guestContext'
import AppShell, { initials } from '@/components/AppShell'
import PageStatus from '@/components/PageStatus'

const NAV = [
  { href: '/activities', label: 'Activities', short: 'Activities' },
  { href: '/leaderboard', label: 'Leaderboard', short: 'Ranks' },
]

// App shell for signed-in guest pages. Sends anyone without a recognised guest
// on this device back to the welcome screen.
export default function GuestShell({ children }) {
  const router = useRouter()
  const { status, guest, forgetDevice } = useGuest()

  useEffect(() => {
    if (status === 'ready' && !guest) router.replace('/')
  }, [status, guest, router])

  if (!guest) return <PageStatus>Loading…</PageStatus>

  // Status comes from the profile the guest RPCs return, so an admin's change
  // shows on the guest's next page load.
  const role = guest.is_committee ? 'Committee' : guest.is_member ? 'Member' : 'Guest'

  return (
    <AppShell
      navLabel="Guest"
      nav={NAV}
      user={{
        name: guest.name,
        sub: guest.nrp ? `${role} · NRP ${guest.nrp}` : role,
        initials: initials(guest.name),
      }}
      action={{ label: 'Not you?', onClick: forgetDevice }}
    >
      {children}
    </AppShell>
  )
}
