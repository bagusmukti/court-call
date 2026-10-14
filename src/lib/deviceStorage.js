// localStorage can throw (private windows, blocked site data), and a guest who
// can't persist a token should still be able to use the app for this visit.

export const DEVICE_TOKEN_KEY = 'courtcall_device_token'
export const GUEST_ID_KEY = 'courtcall_guest_id'

export function readStorage(key) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Not persisted; the guest just re-enters their details next visit.
  }
}

export function removeStorage(key) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Nothing stored to remove.
  }
}
