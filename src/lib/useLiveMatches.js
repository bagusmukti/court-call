'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useLiveRows } from '@/lib/useLiveRows'

const FINISHED = new Set(['completed', 'cancelled'])

// "A", "a", "team_a" → 'a'; anything ending in b → 'b'.
const teamOf = (value) => (String(value || '').toLowerCase().endsWith('b') ? 'b' : 'a')

// Live matches for an activity and who's playing in each active one.
//   byCourt:   { [courtId]: { match, a: [userId], b: [userId] } } — active matches only
//   playingIds: Set of user ids currently on a court
//   versionKey: changes whenever a match is added or changes status — a
//               refreshKey for anything derived from matches (history, records)
//   reload():  re-fetch matches (e.g. after start_match / submit_match_result)
//
// match_participants has no activity_id to filter Realtime on, but start_match
// writes them in the same transaction as the match, so they're fetched when a
// new active match shows up.
export function useLiveMatches(activityId) {
  const { rows: matches, error, live, reload } = useLiveRows('matches', activityId)
  const [players, setPlayers] = useState({}) // matchId -> [{ user_id, team }]

  const activeMatches = useMemo(() => (matches || []).filter((m) => !FINISHED.has(m.status)), [matches])
  const missingKey = activeMatches
    .map((m) => m.id)
    .filter((matchId) => !(matchId in players))
    .sort()
    .join(',')

  useEffect(() => {
    if (!missingKey) return
    let active = true
    const ids = missingKey.split(',')
    async function loadPlayers() {
      const { data, error: playersError } = await supabase
        .from('match_participants')
        .select('match_id, user_id, team')
        .in('match_id', ids)
      if (!active || playersError) return
      const grouped = Object.fromEntries(ids.map((matchId) => [matchId, []]))
      for (const p of data || []) grouped[p.match_id]?.push(p)
      setPlayers((prev) => ({ ...prev, ...grouped }))
    }
    loadPlayers()
    return () => {
      active = false
    }
  }, [missingKey])

  const byCourt = useMemo(() => {
    const out = {}
    for (const match of activeMatches) {
      const list = players[match.id] || []
      out[match.court_id] = {
        match,
        loaded: match.id in players,
        a: list.filter((p) => teamOf(p.team) === 'a').map((p) => p.user_id),
        b: list.filter((p) => teamOf(p.team) === 'b').map((p) => p.user_id),
      }
    }
    return out
  }, [activeMatches, players])

  const playingIds = useMemo(() => {
    const ids = new Set()
    for (const m of Object.values(byCourt)) for (const uid of [...m.a, ...m.b]) ids.add(uid)
    return ids
  }, [byCourt])

  const versionKey = (matches || [])
    .map((m) => `${m.id}:${m.status}`)
    .sort()
    .join(',')

  return { byCourt, playingIds, versionKey, error, live, ready: matches !== null, reload }
}
