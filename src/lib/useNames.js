'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

// Both hooks look up names only for ids they haven't tried yet. Ids that come
// back empty are remembered as null so they aren't asked for again; on an error
// nothing is marked, so the next change of ids retries.
const keyOf = (ids, known) => [...new Set(ids.filter((id) => id && !(id in known)))].sort().join(',')

// Admin: full name + NRP from users.  → { [userId]: { name, nrp } | null }
export function useUserNames(userIds) {
  const [names, setNames] = useState({})
  const missingKey = keyOf(userIds, names)

  useEffect(() => {
    if (!missingKey) return
    let active = true
    const ids = missingKey.split(',')
    async function load() {
      const { data, error } = await supabase.from('users').select('id, name, nrp').in('id', ids)
      if (!active || error) return
      const found = Object.fromEntries((data || []).map((u) => [u.id, { name: u.name, nrp: u.nrp }]))
      setNames((prev) => ({ ...prev, ...Object.fromEntries(ids.map((id) => [id, found[id] ?? null])) }))
    }
    load()
    return () => {
      active = false
    }
  }, [missingKey])

  return names
}

// Guests: first names via get_activity_queue_names (guests can't read users).
// It returns every active booking's name at once, so one call usually covers
// the queue and the courts.  → { [userId]: displayName | null }
export function useQueueNames(activityId, userIds) {
  const [names, setNames] = useState({})
  const missingKey = keyOf(userIds, names)

  useEffect(() => {
    if (!missingKey || !activityId) return
    let active = true
    const ids = missingKey.split(',')
    async function load() {
      const { data, error } = await supabase.rpc('get_activity_queue_names', { p_activity_id: activityId })
      if (!active || error) return
      const found = Object.fromEntries((data || []).map((row) => [row.user_id, row.display_name]))
      setNames((prev) => ({ ...prev, ...found, ...Object.fromEntries(ids.map((id) => [id, found[id] ?? null])) }))
    }
    load()
    return () => {
      active = false
    }
  }, [activityId, missingKey])

  return names
}
