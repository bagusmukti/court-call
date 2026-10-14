'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useGuest } from '@/lib/guestContext'
import { useActivity } from '@/lib/useActivity'
import { MAX_PROOF_BYTES, PROOF_BUCKET, QRIS_ALT, QRIS_IMAGE, needsPayment, proofPath } from '@/lib/payment'
import { rupiah } from '@/lib/format'
import BackLink from '@/components/BackLink'
import PaymentStatus from '@/components/PaymentStatus'

const SHEET = 'mx-auto flex w-full max-w-[520px] flex-col gap-[18px] rounded-[20px] border border-line bg-surface px-[22px] pb-6 pt-[22px]'

function checkFile(file) {
  if (!file) return 'Choose the screenshot of your payment first.'
  if (!file.type.startsWith('image/')) return 'That isn’t an image — choose a screenshot (JPG or PNG).'
  if (file.size > MAX_PROOF_BYTES) return 'That image is over 10 MB — choose a smaller screenshot.'
  return ''
}

export default function PayPage() {
  const { id } = useParams()
  const { guest, bookings, bookingsReady, loadBookings, saveBooking } = useGuest()
  const { activity, error: loadError } = useActivity(id)
  const inputRef = useRef(null)

  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [fileError, setFileError] = useState('')
  // Remembers an upload that worked, so retrying after an RPC error doesn't upload twice.
  const [uploaded, setUploaded] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  const saved = bookings[id]

  // Re-check bookings with Supabase whenever this page opens.
  useEffect(() => {
    loadBookings()
  }, [loadBookings])
  const backToActivity = <BackLink href={`/activities/${id}`}>← Back to the session</BackLink>

  function onFileChange(e) {
    const picked = e.target.files?.[0]
    if (!picked) return // cancelled the picker: keep the current choice
    const problem = checkFile(picked)
    setFileError(problem)
    setSubmitError('')
    if (problem) return
    setFile(picked)
    setPreview(URL.createObjectURL(picked))
  }

  async function onSubmit(e) {
    e.preventDefault()
    const problem = checkFile(file)
    if (problem) {
      setFileError(problem)
      inputRef.current?.focus()
      return
    }

    setSubmitting(true)
    setSubmitError('')
    try {
      let path = uploaded?.file === file ? uploaded.path : null
      if (!path) {
        const { data, error } = await supabase.storage
          .from(PROOF_BUCKET)
          .upload(proofPath(saved.id, file), file, { contentType: file.type, upsert: false })
        if (error) {
          setSubmitError(`Couldn’t upload your screenshot: ${error.message}`)
          return
        }
        // The bucket is private: keep the storage path, not a public URL.
        path = data.path
        setUploaded({ file, path })
      }

      const { error } = await supabase.rpc('submit_payment_proof', {
        p_booking_id: saved.id,
        p_guest_id: guest.id,
        p_amount: Number(activity.fee_amount),
        p_proof_image_url: path,
      })
      if (error) {
        setSubmitError(`Your screenshot uploaded, but the payment couldn’t be recorded: ${error.message}`)
        return
      }
      saveBooking({ ...saved, payment_status: 'pending_review' })
      setSubmitted(true)
    } catch (err) {
      setSubmitError(err?.message || 'Couldn’t reach the server. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-[18px]">
        <BackLink />
        <div role="alert" className="cc-alert">
          {loadError}
        </div>
      </div>
    )
  }

  if (!activity) {
    return (
      <div role="status" className="text-[14px] text-muted">
        Loading payment…
      </div>
    )
  }

  if (!saved && !bookingsReady) {
    return (
      <div role="status" className="text-[14px] text-muted">
        Checking your booking…
      </div>
    )
  }

  if (!saved) {
    return (
      <div className="flex flex-col gap-[18px]">
        {backToActivity}
        <div className="cc-empty">
          <div className="cc-empty-title">Book a spot first</div>
          <div className="mt-1 text-[15px] text-muted">
            There’s no booking for {activity.name} on this device yet. Book from the session page, then pay here.
          </div>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex flex-col gap-[18px]">
        {backToActivity}
        <div className={SHEET}>
          <div role="status" className="flex flex-col items-center gap-2.5 py-2 text-center">
            <div className="cc-eyebrow">Proof sent · {activity.name}</div>
            <div className="font-display text-[clamp(44px,7vw,60px)] font-black uppercase leading-[.85]">
              Payment submitted
            </div>
            <p className="m-0 max-w-[360px] text-pretty text-[15px] leading-normal text-ink-soft">
              Waiting for review — an admin will check your screenshot and confirm your spot.
            </p>
          </div>
          <PaymentStatus booking={{ ...saved, payment_status: 'pending_review' }} activity={activity} />
        </div>
      </div>
    )
  }

  if (!needsPayment(saved, activity)) {
    return (
      <div className="flex flex-col gap-[18px]">
        {backToActivity}
        <div className={SHEET}>
          <div className="cc-eyebrow">Payment · {activity.name}</div>
          <PaymentStatus booking={saved} activity={activity} />
        </div>
      </div>
    )
  }

  const amount = rupiah(activity.fee_amount)

  return (
    <div className="flex flex-col gap-[18px]">
      {backToActivity}
      <form onSubmit={onSubmit} noValidate className={SHEET}>
        <h1 className="cc-eyebrow m-0">Scan to pay</h1>

        <div className="flex flex-col items-center gap-3 text-center">
          <div className="text-[12px] font-semibold uppercase tracking-[.08em] text-muted">Amount to pay</div>
          <div className="font-display text-[56px] font-black leading-[.85] tabular-nums">{amount}</div>
          <div className="text-[14px] text-muted">
            {activity.name} · queue <span className="font-bold text-ink">#{saved.queue_position}</span>
          </div>
          <div className="rounded-[14px] border border-line bg-white p-4">
            <Image
              src={QRIS_IMAGE}
              alt={QRIS_ALT}
              priority
              className="block h-auto w-[min(220px,58vw)]"
            />
          </div>
          <p className="m-0 max-w-[340px] text-[14px] font-semibold leading-snug text-amber">
            This QR code doesn’t fill in the amount — type exactly {amount} in your app.
          </p>
        </div>

        <ol className="m-0 list-decimal pl-5 text-[14px] leading-[1.65] text-ink-soft">
          <li>Open any banking or e-wallet app and scan the code.</li>
          <li>
            Enter the amount: <span className="font-bold text-ink">{amount}</span>.
          </li>
          <li>Screenshot the success screen and upload it below.</li>
        </ol>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="proof" className="cc-label">
            Payment screenshot
          </label>
          <label
            htmlFor="proof"
            className={`flex cursor-pointer items-center gap-3.5 rounded-xl border-[1.5px] border-dashed bg-white p-3 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-navy ${
              fileError ? 'border-danger' : 'border-[#AAB6C6] hover:border-navy'
            }`}
          >
            {preview ? (
              // Local object URL preview; next/image can't optimise blob: URLs.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="size-16 shrink-0 rounded-lg border border-line object-cover" />
            ) : (
              <span
                aria-hidden="true"
                className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-[#EEF1F5] font-display text-[28px] font-black text-navy"
              >
                +
              </span>
            )}
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[15px] font-semibold">{file ? file.name : 'Choose screenshot'}</span>
              <span className="text-[13px] text-muted">{file ? 'Tap to choose a different image' : 'JPG or PNG, up to 10 MB'}</span>
            </span>
            <input
              ref={inputRef}
              id="proof"
              name="proof"
              type="file"
              accept="image/*"
              onChange={onFileChange}
              aria-invalid={fileError ? 'true' : undefined}
              aria-describedby={fileError ? 'proof-error' : undefined}
              className="sr-only"
            />
          </label>
          {fileError ? (
            <span id="proof-error" className="cc-field-error">
              {fileError}
            </span>
          ) : null}
        </div>

        {submitError ? (
          <div role="alert" className="cc-alert">
            {submitError}
          </div>
        ) : null}

        <button type="submit" disabled={submitting} className="cc-btn-primary">
          {submitting ? 'Sending proof…' : 'I’ve paid · submit proof'}
        </button>
      </form>
    </div>
  )
}
