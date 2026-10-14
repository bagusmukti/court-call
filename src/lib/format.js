export const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
export const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

export const PAYMENT_LABEL = { upfront: 'Pay upfront', deferred: 'Pay later' }

export const rupiah = (v) => (Number(v) > 0 ? 'Rp ' + Number(v).toLocaleString('id-ID') : 'Free')

// 24-hour "19:00" in the viewer's time zone.
export const clockTime = (date) =>
  date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':')

// "Saturday, 17 October 2026"
export const longDate = (date) =>
  date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export const courtsLabel = (n) => `${n} ${n === 1 ? 'court' : 'courts'}`

// "awaiting_payment" -> "Awaiting payment"
export const humanize = (value) => {
  const text = String(value || '').replace(/_/g, ' ').trim()
  return text ? text[0].toUpperCase() + text.slice(1) : ''
}
