'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

// Rows of `table` for one activity, kept current with Supabase Realtime.
//   { rows: array | null, error: string, live: boolean, applyRow(row), reload() }
// rows is null until the first load; live is true while the channel is subscribed.
// applyRow adds/replaces a row locally — e.g. right after this client inserts it,
// so it shows even if Realtime is down (the matching event is then a no-op).
// reload re-fetches — e.g. after an RPC that changed rows server-side.
//
// The initial load runs each time the channel (re)subscribes, so changes missed
// while disconnected are picked up. DELETE events can't be filtered by
// activity_id (Realtime only sends the primary key for deletes), so deletes are
// heard table-wide and applied only if the id is one of ours.
export function useLiveRows(table, activityId, columns = '*') {
  const [state, setState] = useState({ rows: null, error: '', live: false })
  const loadRef = useRef(null)

  useEffect(() => {
    if (!activityId) return
    let active = true

    async function load() {
      const { data, error } = await supabase.from(table).select(columns).eq('activity_id', activityId)
      if (!active) return
      if (error) setState((s) => ({ ...s, error: `Couldn’t load ${table}: ${error.message}` }))
      else setState((s) => ({ ...s, rows: data, error: '' }))
    }

    const upsert = (row) =>
      setState((s) => {
        if (!s.rows) return s
        const rest = s.rows.filter((r) => r.id !== row.id)
        return { ...s, rows: [...rest, row] }
      })

    const remove = (id) =>
      setState((s) => (s.rows?.some((r) => r.id === id) ? { ...s, rows: s.rows.filter((r) => r.id !== id) } : s))

    loadRef.current = load

    // Load straight away too, so the page still fills in if Realtime can't connect.
    load()

    const filter = `activity_id=eq.${activityId}`
    const channel = supabase
      .channel(`${table}-${activityId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter }, ({ new: row }) => upsert(row))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table, filter }, ({ new: row }) => upsert(row))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table }, ({ old }) => old?.id && remove(old.id))
      .subscribe((status) => {
        if (!active) return
        if (status === 'SUBSCRIBED') {
          setState((s) => ({ ...s, live: true }))
          load()
        } else {
          setState((s) => ({ ...s, live: false }))
        }
      })

    return () => {
      active = false
      loadRef.current = null
      supabase.removeChannel(channel)
    }
  }, [table, activityId, columns])

  const applyRow = useCallback(
    (row) =>
      setState((s) => (s.rows ? { ...s, rows: [...s.rows.filter((r) => r.id !== row.id), row] } : s)),
    []
  )

  const reload = useCallback(() => loadRef.current?.(), [])

  return { ...state, applyRow, reload }
}
