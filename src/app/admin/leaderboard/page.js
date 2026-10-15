'use client'

import Leaderboard from '@/components/Leaderboard'

// Read-only for admins: same ranking guests see, without a "You" row.
export default function AdminLeaderboardPage() {
  return <Leaderboard />
}
