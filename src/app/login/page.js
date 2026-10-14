'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Logo from '@/components/Logo'
import Field, { fieldProps } from '@/components/Field'

function validate({ email, password }) {
  const errors = {}
  if (!email.trim()) errors.email = 'Enter your admin email.'
  else if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = 'That doesn’t look like an email address.'
  if (!password) errors.password = 'Enter your password.'
  return errors
}

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
    if (Object.keys(found).length) return

    setSubmitting(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      })
      if (error) {
        setFormError(
          error.message === 'Invalid login credentials'
            ? 'Wrong email or password. Check both and try again.'
            : error.message
        )
        return
      }

      // Signing in only proves who they are — the admin desk also needs role = 'admin'.
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()
      if (profileError) {
        await supabase.auth.signOut()
        setFormError(`Signed in, but we couldn’t check your access: ${profileError.message}`)
        return
      }
      if (profile?.role !== 'admin') {
        await supabase.auth.signOut()
        setFormError('This account doesn’t have admin access. Ask a club admin to grant it.')
        return
      }

      router.replace('/admin')
    } catch (err) {
      setFormError(err?.message || 'Couldn’t reach the server. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-1 flex-wrap bg-paper">
      <div className="flex flex-[1_1_380px] flex-col justify-between gap-9 bg-navy-deep p-[clamp(20px,5vw,56px)] text-paper">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo size={64} />
            <span className="font-display text-[22px] font-black uppercase tracking-[.06em]">Court Call</span>
          </div>
          <Link
            href="/"
            className="cc-focus-on-dark flex min-h-11 items-center rounded-[10px] border border-paper/25 px-3.5 text-[14px] font-semibold text-paper no-underline hover:bg-paper/[.06]"
          >
            ← Back
          </Link>
        </div>
        <div className="flex flex-col gap-4">
          <div className="font-display text-[15px] font-bold uppercase tracking-[.14em] text-yellow">
            Admin desk · sign in
          </div>
          <h1 className="m-0 font-display text-[clamp(60px,8vw,116px)] font-black uppercase leading-[.82]">
            Run the
            <br />
            courts
          </h1>
          <p className="m-0 max-w-[420px] text-pretty text-[16px] leading-normal text-paper/[.82]">
            Create activities, run courts and the queue, log scores. Admin accounts only — players
            don’t need to sign in.
          </p>
        </div>
      </div>

      <div className="flex flex-[1_1_420px] items-center justify-center p-[clamp(20px,5vw,56px)]">
        <form onSubmit={onSubmit} noValidate className="flex w-full max-w-[460px] flex-col gap-[18px]">
          {formError ? (
            <div
              role="alert"
              className="rounded-[10px] border-[1.5px] border-danger bg-surface px-3.5 py-3 text-[14px] font-medium leading-snug text-danger"
            >
              {formError}
            </div>
          ) : null}

          <Field id="email" label="Email" error={errors.email} large>
            <input
              {...fieldProps('email', { error: errors.email })}
              type="email"
              autoComplete="username"
              inputMode="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={onChange}
              className="cc-input cc-input-lg"
            />
          </Field>

          <Field id="password" label="Password" error={errors.password} large>
            <input
              {...fieldProps('password', { error: errors.password })}
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={onChange}
              className="cc-input cc-input-lg"
            />
          </Field>

          <button type="submit" disabled={submitting} className="cc-btn-primary mt-1.5 text-[22px]">
            {submitting ? 'Signing in…' : 'Sign in →'}
          </button>
          <Link
            href="/join"
            className="cc-focus flex min-h-11 items-center justify-center self-center rounded-md px-3 text-[14px] text-muted underline underline-offset-[3px] hover:text-navy"
          >
            Here to play? Check in as a guest
          </Link>
        </form>
      </div>
    </div>
  )
}
