'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useAdmin } from '@/lib/adminContext'
import Field, { fieldProps } from '@/components/Field'

const PAYMENT_MODES = [
  { value: 'upfront', label: 'Upfront' },
  { value: 'deferred', label: 'Deferred' },
]

const rupiah = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID')

const isWholeNumber = (v) => /^\d+$/.test(String(v).trim())

function validate(form) {
  const errors = {}

  if (!form.name.trim()) errors.name = 'Give the session a name guests will recognise.'

  if (!form.start_time) errors.start_time = 'Pick the date and time the session starts.'
  else if (Number.isNaN(new Date(form.start_time).getTime())) errors.start_time = 'That date and time isn’t valid.'
  // datetime-local has minute precision, so the current minute still counts as "now".
  else if (new Date(form.start_time).getTime() < new Date().setSeconds(0, 0))
    errors.start_time = 'Start time can’t be in the past.'

  if (!form.location.trim()) errors.location = 'Say where the session is held.'

  if (form.max_participants === '') errors.max_participants = 'Set how many players can join.'
  else if (!isWholeNumber(form.max_participants) || Number(form.max_participants) < 1)
    errors.max_participants = 'Use a whole number, 1 or more.'

  const fee = Number(form.fee_amount)
  if (form.fee_amount === '') errors.fee_amount = 'Enter the fee — use 0 if it’s free.'
  else if (!Number.isFinite(fee) || fee < 0) errors.fee_amount = 'The fee can’t be negative.'
  else if (fee > 99999999.99) errors.fee_amount = 'That fee is too large.'

  if (!PAYMENT_MODES.some((m) => m.value === form.payment_mode)) errors.payment_mode = 'Choose how players pay.'

  if (form.planned_courts !== '' && (!isWholeNumber(form.planned_courts) || Number(form.planned_courts) < 1))
    errors.planned_courts = 'Use a whole number, 1 or more — or leave it blank.'

  return errors
}

export default function NewActivityPage() {
  const router = useRouter()
  const admin = useAdmin()
  const redirectTimer = useRef(null)

  const [form, setForm] = useState({
    name: '',
    start_time: '',
    location: '',
    max_participants: '',
    fee_amount: '',
    payment_mode: '',
    planned_courts: '',
    contact_person_id: admin.id,
  })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  // Starts with the logged-in admin so the dropdown is usable before the list loads.
  const [contacts, setContacts] = useState([{ id: admin.id, name: admin.name }])
  const [contactsError, setContactsError] = useState('')

  useEffect(() => {
    let active = true
    async function loadContacts() {
      const { data, error } = await supabase.from('users').select('id, name').eq('role', 'admin').order('name')
      if (!active) return
      if (error) {
        setContactsError(`Couldn’t load the admin list: ${error.message}`)
        return
      }
      if (data?.length) setContacts(data)
    }
    loadContacts()
    return () => {
      active = false
      clearTimeout(redirectTimer.current)
    }
  }, [])

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
      const { error } = await supabase.from('activities').insert({
        name: form.name.trim(),
        // datetime-local is the admin's local wall-clock time; store it as an absolute instant.
        start_time: new Date(form.start_time).toISOString(),
        location: form.location.trim(),
        max_participants: Number(form.max_participants),
        fee_amount: Number(form.fee_amount),
        payment_mode: form.payment_mode,
        planned_courts: form.planned_courts === '' ? null : Number(form.planned_courts),
        contact_person_id: form.contact_person_id || null,
        status: 'draft',
        created_by: admin.id,
      })
      if (error) {
        setFormError(`Couldn’t save the activity: ${error.message}`)
        setSubmitting(false)
        return
      }
      setSaved(true)
      redirectTimer.current = setTimeout(() => router.push('/admin'), 1600)
    } catch (err) {
      setFormError(err?.message || 'Couldn’t reach the server. Check your connection and try again.')
      setSubmitting(false)
    }
  }

  const feeHint = form.fee_amount !== '' && Number(form.fee_amount) >= 0 ? rupiah(form.fee_amount) : undefined

  return (
    <div className="flex flex-col gap-[22px]">
      <div>
        <div className="cc-eyebrow">New activity</div>
        <h1 className="cc-page-title">Create activity</h1>
      </div>

      <form
        onSubmit={onSubmit}
        noValidate
        className="flex w-full max-w-[640px] flex-col gap-4 rounded-[20px] border border-line bg-surface p-[22px]"
      >
        <div className="font-display text-[38px] font-black uppercase leading-[.9]">Put a session on the board</div>

        {formError ? (
          <div
            role="alert"
            className="rounded-[10px] border-[1.5px] border-danger bg-white px-3.5 py-3 text-[14px] font-medium leading-snug text-danger"
          >
            {formError}
          </div>
        ) : null}

        <Field id="name" label="Name" error={errors.name}>
          <input
            {...fieldProps('name', { error: errors.name })}
            type="text"
            placeholder="e.g. Thursday Night Rally"
            value={form.name}
            onChange={onChange}
            className="cc-input"
          />
        </Field>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-3">
          <Field id="start_time" label="Starts" error={errors.start_time}>
            <input
              {...fieldProps('start_time', { error: errors.start_time })}
              type="datetime-local"
              value={form.start_time}
              onChange={onChange}
              className="cc-input"
            />
          </Field>
          <Field id="location" label="Location" error={errors.location}>
            <input
              {...fieldProps('location', { error: errors.location })}
              type="text"
              placeholder="e.g. Sports Hall B"
              value={form.location}
              onChange={onChange}
              className="cc-input"
            />
          </Field>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,140px),1fr))] gap-3">
          <Field id="planned_courts" label="Courts (optional)" error={errors.planned_courts}>
            <input
              {...fieldProps('planned_courts', { error: errors.planned_courts })}
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={form.planned_courts}
              onChange={onChange}
              className="cc-input tabular-nums"
            />
          </Field>
          <Field id="max_participants" label="Spots" error={errors.max_participants}>
            <input
              {...fieldProps('max_participants', { error: errors.max_participants })}
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={form.max_participants}
              onChange={onChange}
              className="cc-input tabular-nums"
            />
          </Field>
          <Field id="fee_amount" label="Fee (Rp)" error={errors.fee_amount} hint={feeHint}>
            <input
              {...fieldProps('fee_amount', { error: errors.fee_amount, hint: feeHint })}
              type="number"
              inputMode="decimal"
              min="0"
              step="1000"
              placeholder="15000"
              value={form.fee_amount}
              onChange={onChange}
              className="cc-input tabular-nums"
            />
          </Field>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-3">
          <Field id="payment_mode" label="Payment mode" error={errors.payment_mode}>
            <select
              {...fieldProps('payment_mode', { error: errors.payment_mode })}
              value={form.payment_mode}
              onChange={onChange}
              className="cc-input"
            >
              <option value="" disabled>
                Choose…
              </option>
              {PAYMENT_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <Field id="contact_person_id" label="Contact person">
            <select
              {...fieldProps('contact_person_id')}
              value={form.contact_person_id}
              onChange={onChange}
              className="cc-input"
            >
              <option value="">No contact person</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {contactsError ? <div className="text-[13px] font-medium text-amber">{contactsError}</div> : null}

        <button type="submit" disabled={submitting} className="cc-btn-primary mt-1">
          {saved ? 'Saved' : submitting ? 'Saving…' : 'Save draft'}
        </button>
      </form>

      {saved ? (
        <div
          role="status"
          className="fixed bottom-[88px] left-1/2 z-[100] w-max max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-xl bg-navy-deep px-[18px] py-3 text-[14px] font-medium leading-[1.4] text-paper shadow-[0_12px_32px_rgba(10,30,79,.32)] min-[880px]:bottom-7"
        >
          Draft saved — taking you back to the dashboard.
        </div>
      ) : null}
    </div>
  )
}
