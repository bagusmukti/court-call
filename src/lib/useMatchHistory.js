'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

// Both hooks take a refreshKey; pass something that changes when matches
// change (see useLiveMatches().versionKey) so results appear without a refresh.

// Match history for one activity, newest first.  → { rows: array | null, error }
export function useMatchHistory(activityId, refreshKey) {
  const [state, setState] = useState({ rows: null, error: '' })

  useEffect(() => {
    if (!activityId) return
    let active = true
    async function load() {
      const { data, error } = await supabase.rpc('get_match_history', { p_activity_id: activityId })
      if (!active) return
      if (error) {
        setState((s) => ({ ...s, error: `Couldn’t load match history: ${error.message}` }))
        return
      }
      const rows = (data || [])
        .slice()
        .sort((a, b) => new Date(b.started_at || 0) - new Date(a.started_at || 0))
      setState({ rows, error: '' })
    }
    load()
    return () => {
      active = false
    }
  }, [activityId, refreshKey])

  return state
}

// A user's all-time record across every activity.  → { wins, losses, total } | null
export function useMatchRecord(userId, refreshKey) {
  const [record, setRecord] = useState(null)

  useEffect(() => {
    if (!userId) return
    let active = true
    async function load() {
      const { data, error } = await supabase.rpc('get_user_match_record', { p_user_id: userId })
      if (!active || error) return
      const row = Array.isArray(data) ? data[0] : data
      if (row) setRecord({ wins: Number(row.wins) || 0, losses: Number(row.losses) || 0, total: Number(row.total) || 0 })
    }
    load()
    return () => {
      active = false
    }
  }, [userId, refreshKey])

  return record
}
