'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  BOOKINGS_KEY,
  DEVICE_TOKEN_KEY,
  GUEST_ID_KEY,
  readStorage,
  removeStorage,
  writeStorage,
} from '@/lib/deviceStorage'

const GuestContext = createContext(null)

// RPCs may come back as a single row, a one-row array, or nothing.
export function firstRow(data) {
  const row = Array.isArray(data) ? data[0] : data
  return row && row.id ? row : null
}

const pickBooking = (b) => ({
  id: b.id,
  activity_id: b.activity_id,
  queue_position: b.queue_position,
  payment_status: b.payment_status,
  booking_status: b.booking_status,
})

// The guest's bookings from Supabase as { [activityId]: booking }, or null if
// they couldn't be fetched. Cancelled bookings don't hold a spot, so they're left out.
async function fetchGuestBookings(guestId) {
  try {
    const { data, error } = await supabase.from('bookings').select('*').eq('user_id', guestId)
    if (error) return null
    const byActivity = {}
    for (const b of data || []) if (b.booking_status !== 'cancelled') byActivity[b.activity_id] = pickBooking(b)
    return byActivity
  } catch {
    return null
  }
}

// Bookings cached on this device, per guest id then activity id:
//   { [guestId]: { [activityId]: { id, activity_id, queue_position, payment_status, booking_status } } }
function readBookingStore() {
  try {
    const parsed = JSON.parse(readStorage(BOOKINGS_KEY) || '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const NO_BOOKINGS = {}

// Holds the current guest and their bookings for every guest-facing page. On
// first load it looks up this device's saved token so returning guests skip the
// entry form.
//   status:        'checking' until the device lookup finishes, then 'ready'
//   bookings:      { [activityId]: booking } — from Supabase, with the device
//                  cache shown until the first fetch returns
//   bookingsReady: true once bookings have been fetched (or the fetch failed)
//   loadBookings:  fetch from Supabase; every page that shows bookings calls it
//                  when it opens (and again whenever the guest changes)
export function GuestProvider({ children }) {
  const [status, setStatus] = useState('checking')
  const [guest, setGuest] = useState(null)
  const [bookingStore, setBookingStore] = useState({})
  const [bookingsLoadedFor, setBookingsLoadedFor] = useState(null)

  useEffect(() => {
    let active = true
    async function restore() {
      const token = readStorage(DEVICE_TOKEN_KEY)
      let found = null
      if (token) {
        try {
          const { data, error } = await supabase.rpc('get_guest_by_device_token', { p_device_token: token })
          if (!error) found = firstRow(data)
        } catch {
          // Offline or RPC unavailable: fall back to the entry form.
        }
      }
      if (!active) return
      setBookingStore(readBookingStore())
      setGuest((current) => current ?? found)
      setStatus('ready')
    }
    restore()
    return () => {
      active = false
    }
  }, [])

  const guestId = guest?.id
  const bookings = (guestId && bookingStore[guestId]) || NO_BOOKINGS
  const bookingsReady = !!guestId && bookingsLoadedFor === guestId

  const replaceGuestBookings = useCallback((id, byActivity) => {
    setBookingStore((store) => {
      const next = { ...store, [id]: byActivity }
      writeStorage(BOOKINGS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  // The database is the source of truth: a refresh, another device or an admin
  // action can all change bookings without this device knowing. If the fetch
  // fails, the device cache stays on screen rather than "not booked".
  const applyFetched = useCallback(
    (id, byActivity) => {
      if (byActivity) replaceGuestBookings(id, byActivity)
      setBookingsLoadedFor(id)
    },
    [replaceGuestBookings]
  )

  const loadBookings = useCallback(async () => {
    if (!guestId) return
    applyFetched(guestId, await fetchGuestBookings(guestId))
  }, [guestId, applyFetched])

  const saveBooking = useCallback(
    (booking) => {
      if (!guestId) return
      const saved = pickBooking(booking)
      setBookingStore((store) => {
        const next = { ...store, [guestId]: { ...store[guestId], [saved.activity_id]: saved } }
        writeStorage(BOOKINGS_KEY, JSON.stringify(next))
        return next
      })
    },
    [guestId]
  )

  // "Not you?" — forget this device (and this guest's saved bookings) so the
  // next person starts fresh.
  const forgetDevice = useCallback(() => {
    removeStorage(DEVICE_TOKEN_KEY)
    removeStorage(GUEST_ID_KEY)
    if (guestId) {
      setBookingStore((store) => {
        const next = { ...store }
        delete next[guestId]
        writeStorage(BOOKINGS_KEY, JSON.stringify(next))
        return next
      })
    }
    setGuest(null)
  }, [guestId])

  const value = useMemo(
    () => ({ status, guest, setGuest, forgetDevice, bookings, bookingsReady, loadBookings, saveBooking }),
    [status, guest, forgetDevice, bookings, bookingsReady, loadBookings, saveBooking]
  )

  return <GuestContext.Provider value={value}>{children}</GuestContext.Provider>
}

export function useGuest() {
  return useContext(GuestContext)
}
