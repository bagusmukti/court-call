// The club's static QRIS code. To swap it, replace src/assets/qris.svg — or add
// the real image (e.g. qris.png) next to it and change the import below.
// The QR carries no amount, so the payment screen shows the fee as text.
import qrisImage from '@/assets/qris.svg'

export const QRIS_IMAGE = qrisImage
export const QRIS_ALT = 'Court Call club QRIS payment code'

export const PROOF_BUCKET = 'payment-proofs'
export const MAX_PROOF_BYTES = 10 * 1024 * 1024

const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/gif': 'gif' }

// Storage object name for a proof: "<bookingId>-<timestamp>.<ext>".
export function proofPath(bookingId, file) {
  const ext = EXTENSIONS[file.type] || 'jpg'
  return `${bookingId}-${Date.now()}.${ext}`
}

// Whether a booking still needs the guest to pay.
export const needsPayment = (booking, activity) =>
  booking?.payment_status === 'unpaid' && Number(activity?.fee_amount) > 0
