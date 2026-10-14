'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { DEVICE_TOKEN_KEY, GUEST_ID_KEY, readStorage, removeStorage } from '@/lib/deviceStorage'

const GuestContext = createContext(null)

// RPCs may come back as a single row, a one-row array, or nothing.
export function firstGuestRow(data) {
  const row = Array.isArray(data) ? data[0] : data
  return row && row.id ? row : null
}

// Holds the current guest for every guest-facing page. On first load it looks
// up this device's saved token so returning guests skip the entry form.
//   status: 'checking' until the device lookup finishes, then 'ready'
export function GuestProvider({ children }) {
  const [status, setStatus] = useState('checking')
  const [guest, setGuest] = useState(null)

  useEffect(() => {
    let active = true
    async function restore() {
      const token = readStorage(DEVICE_TOKEN_KEY)
      let found = null
      if (token) {
        try {
          const { data, error } = await supabase.rpc('get_guest_by_device_token', { p_device_token: token })
          if (!error) found = firstGuestRow(data)
        } catch {
          // Offline or RPC unavailable: fall back to the entry form.
        }
      }
      if (!active) return
      setGuest((current) => current ?? found)
      setStatus('ready')
    }
    restore()
    return () => {
      active = false
    }
  }, [])

  // "Not you?" — forget this device so the next person starts fresh.
  const forgetDevice = useCallback(() => {
    removeStorage(DEVICE_TOKEN_KEY)
    removeStorage(GUEST_ID_KEY)
    setGuest(null)
  }, [])

  const value = useMemo(() => ({ status, guest, setGuest, forgetDevice }), [status, guest, forgetDevice])

  return <GuestContext.Provider value={value}>{children}</GuestContext.Provider>
}

export function useGuest() {
  return useContext(GuestContext)
}
