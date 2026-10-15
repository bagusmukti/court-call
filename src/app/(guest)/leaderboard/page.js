'use client'

import { useGuest } from '@/lib/guestContext'
import Leaderboard from '@/components/Leaderboard'

export default function GuestLeaderboardPage() {
  const { guest } = useGuest()
  return <Leaderboard meId={guest.id} />
}
