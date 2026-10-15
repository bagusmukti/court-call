// The club's QRIS code is uploaded by an admin (Payment settings) and stored in
// club_settings.qris_image_url. It carries no amount, so the payment screen
// shows the fee as text next to it.
export const QRIS_ALT = 'Court Call club QRIS payment code'
export const QRIS_BUCKET = 'qris-codes'
export const MAX_QRIS_BYTES = 5 * 1024 * 1024

export const PROOF_BUCKET = 'payment-proofs'
export const MAX_PROOF_BYTES = 10 * 1024 * 1024

const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/gif': 'gif', 'image/svg+xml': 'svg' }
const extOf = (file) => EXTENSIONS[file.type] || 'jpg'

// Storage object name for a proof: "<bookingId>-<timestamp>.<ext>".
export function proofPath(bookingId, file) {
  return `${bookingId}-${Date.now()}.${extOf(file)}`
}

// A fresh name per upload, so browsers never show a cached old code.
export function qrisPath(file) {
  return `qris-${Date.now()}.${extOf(file)}`
}

// Whether a booking still needs the guest to pay.
export const needsPayment = (booking, activity) =>
  booking?.payment_status === 'unpaid' && Number(activity?.fee_amount) > 0
