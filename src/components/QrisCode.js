'use client'

import { useState } from 'react'
import { QRIS_ALT } from '@/lib/payment'

// The club's QRIS code in a white frame. Shows a placeholder instead of a
// broken image when no code is set or the image can't be loaded.
//   url: image URL or null   loading: still fetching club_settings
//   emptyText: what to say when there's no code
export default function QrisCode({ url, loading = false, emptyText = 'QR code not available yet.' }) {
  const [failedUrl, setFailedUrl] = useState(null)
  const broken = url && failedUrl === url

  if (loading) {
    return (
      <div role="status" className="flex size-[min(252px,66vw)] items-center justify-center rounded-[14px] border border-line bg-white text-[13px] text-muted">
        Loading QR code…
      </div>
    )
  }

  if (!url || broken) {
    return (
      <div className="flex w-[min(252px,66vw)] flex-col items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-[#AAB6C6] bg-white px-4 py-8 text-center">
        <span aria-hidden="true" className="font-display text-[34px] font-black leading-none text-line">
          QR
        </span>
        <span className="text-[14px] font-semibold text-ink">{broken ? 'The QR code couldn’t be loaded.' : emptyText}</span>
      </div>
    )
  }

  return (
    <div className="rounded-[14px] border border-line bg-white p-4">
      {/* Public storage URL that changes per upload; no optimisation needed for a QR. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={QRIS_ALT}
        onError={() => setFailedUrl(url)}
        className="block h-auto w-[min(220px,58vw)]"
      />
    </div>
  )
}
