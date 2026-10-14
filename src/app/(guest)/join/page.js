'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { firstGuestRow, useGuest } from '@/lib/guestContext'
import { DEVICE_TOKEN_KEY, GUEST_ID_KEY, readStorage, writeStorage } from '@/lib/deviceStorage'
import Logo from '@/components/Logo'
import Field, { fieldProps } from '@/components/Field'

const CLASS_LEVELS = [
  { value: '1', label: 'Class 1 · semesters 1–2' },
  { value: '2', label: 'Class 2 · semesters 3–4' },
  { value: '3', label: 'Class 3 · semesters 5–6' },
  { value: '4', label: 'Class 4 · semesters 7–8' },
]

const CLASS_HINT = 'Based on your current semester pair.'

const stripPhone = (v) => v.replace(/[\s\-().]/g, '')

function validate(form) {
  const errors = {}
  if (form.name.trim().length < 2) errors.name = 'Tell us your full name.'
  if (form.whatsapp.trim() && !/^\+?\d{9,15}$/.test(stripPhone(form.whatsapp)))
    errors.whatsapp = 'Use an active WhatsApp number, e.g. 0812 3456 7890.'
  if (!form.nrp.trim()) errors.nrp = 'Enter your NRP (student number).'
  if (!CLASS_LEVELS.some((c) => c.value === form.class_level)) errors.class_level = 'Pick your class.'
  return errors
}

export default function JoinPage() {
  const router = useRouter()
  const { guest, setGuest } = useGuest()
  const [form, setForm] = useState({ name: '', whatsapp: '', nrp: '', class_level: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Already checked in on this device (or just submitted): straight to activities.
  useEffect(() => {
    if (guest) router.replace('/activities')
  }, [guest, router])

  function onChange(e) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    const found = validate(form)
    setErrors(found)
    setFormError('')
    const firstInvalid = Object.keys(found)[0]
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus()
      return
    }

    setSubmitting(true)
    try {
      const deviceToken = readStorage(DEVICE_TOKEN_KEY) || crypto.randomUUID()
      const { data, error } = await supabase.rpc('find_or_create_guest', {
        p_nrp: form.nrp.trim(),
        p_name: form.name.trim(),
        p_whatsapp_number: form.whatsapp.trim() ? stripPhone(form.whatsapp) : null,
        p_class_level: Number(form.class_level),
        p_device_token: deviceToken,
      })
      if (error) {
        setFormError(`Couldn’t check you in: ${error.message}`)
        setSubmitting(false)
        return
      }
      const profile = firstGuestRow(data)
      if (!profile) {
        setFormError('Couldn’t check you in — the server didn’t return your profile. Try again in a moment.')
        setSubmitting(false)
        return
      }
      writeStorage(DEVICE_TOKEN_KEY, deviceToken)
      writeStorage(GUEST_ID_KEY, profile.id)
      setGuest(profile) // the effect above takes them to /activities
    } catch (err) {
      setFormError(err?.message || 'Couldn’t reach the server. Check your connection and try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-1 flex-wrap bg-paper">
      <div className="flex flex-[1_1_380px] flex-col justify-between gap-9 bg-navy-deep p-[clamp(20px,5vw,56px)] text-paper">
        <div className="flex items-center justify-between gap-3">
          <Logo size={64} />
          <Link
            href="/"
            className="cc-focus-on-dark flex min-h-11 items-center rounded-[10px] border border-paper/25 px-3.5 text-[14px] font-semibold text-paper no-underline hover:bg-paper/[.06]"
          >
            ← Back
          </Link>
        </div>
        <div className="flex flex-col gap-4">
          <div className="font-display text-[15px] font-bold uppercase tracking-[.14em] text-yellow">
            Guest check-in · 20 seconds
          </div>
          <h1 className="m-0 font-display text-[clamp(60px,8vw,116px)] font-black uppercase leading-[.82]">
            Who’s
            <br />
            playing?
          </h1>
          <p className="m-0 max-w-[420px] text-pretty text-[16px] leading-normal text-paper/[.82]">
            Your name goes on the queue board and the admin desk. WhatsApp is only for pinging you when you’re up.
          </p>
        </div>
      </div>

      <div className="flex flex-[1_1_420px] items-center justify-center p-[clamp(20px,5vw,56px)]">
        <form onSubmit={onSubmit} noValidate className="flex w-full max-w-[460px] flex-col gap-[18px]">
          {formError ? (
            <div role="alert" className="cc-alert">
              {formError}
            </div>
          ) : null}

          <Field id="name" label="Full name" error={errors.name} large>
            <input
              {...fieldProps('name', { error: errors.name })}
              type="text"
              autoComplete="name"
              placeholder="e.g. Kirana Maheswari"
              value={form.name}
              onChange={onChange}
              className="cc-input cc-input-lg"
            />
          </Field>

          <Field id="whatsapp" label="WhatsApp number" error={errors.whatsapp} large>
            <input
              {...fieldProps('whatsapp', { error: errors.whatsapp })}
              type="tel"
              autoComplete="tel"
              placeholder="0812 3456 7890"
              value={form.whatsapp}
              onChange={onChange}
              className="cc-input cc-input-lg"
            />
          </Field>

          <div className="flex flex-wrap gap-x-3.5 gap-y-[18px]">
            <Field id="nrp" label="NRP" error={errors.nrp} large className="flex-[1_1_180px]">
              <input
                {...fieldProps('nrp', { error: errors.nrp })}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Student number"
                required
                value={form.nrp}
                onChange={onChange}
                className="cc-input cc-input-lg tabular-nums"
              />
            </Field>
            <Field
              id="class_level"
              label="Class"
              error={errors.class_level}
              hint={CLASS_HINT}
              large
              className="flex-[1_1_180px]"
            >
              <select
                {...fieldProps('class_level', { error: errors.class_level, hint: CLASS_HINT })}
                value={form.class_level}
                onChange={onChange}
                className="cc-input cc-input-lg"
              >
                <option value="" disabled>
                  Choose…
                </option>
                {CLASS_LEVELS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <button type="submit" disabled={submitting || !!guest} className="cc-btn-primary mt-1.5 text-[22px]">
            {submitting || guest ? 'Checking you in…' : 'Let me in →'}
          </button>
        </form>
      </div>
    </div>
  )
}
