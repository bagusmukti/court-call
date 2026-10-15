'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

// The single club_settings row (readable by anyone).
//   { settings: { qris_image_url, updated_at } | null, loading, error, setSettings }
export function useClubSettings() {
  const [state, setState] = useState({ settings: null, loading: true, error: '' })

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error } = await supabase
        .from('club_settings')
        .select('qris_image_url, updated_at')
        .eq('id', true)
        .maybeSingle()
      if (!active) return
      if (error) setState({ settings: null, loading: false, error: `Couldn’t load payment settings: ${error.message}` })
      else setState({ settings: data || { qris_image_url: null, updated_at: null }, loading: false, error: '' })
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const setSettings = useCallback((settings) => setState({ settings, loading: false, error: '' }), [])

  return { ...state, setSettings }
}
