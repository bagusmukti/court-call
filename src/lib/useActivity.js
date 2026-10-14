'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

const COLUMNS =
  'id, name, start_time, location, max_participants, fee_amount, payment_mode, planned_courts, status, contact_person_id'

// Loads one activity by id for the guest pages.
//   { activity: row | null, error: string }  — both empty while loading
export function useActivity(id) {
  const [state, setState] = useState({ activity: null, error: '' })

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error } = await supabase.from('activities').select(COLUMNS).eq('id', id).maybeSingle()
      if (!active) return
      // 22P02: the id in the URL isn't a valid UUID — same as not found.
      if (error && error.code !== '22P02') setState({ activity: null, error: `Couldn’t load this activity: ${error.message}` })
      else if (!data) setState({ activity: null, error: 'This activity doesn’t exist or is no longer available.' })
      else setState({ activity: data, error: '' })
    }
    load()
    return () => {
      active = false
    }
  }, [id])

  return state
}
