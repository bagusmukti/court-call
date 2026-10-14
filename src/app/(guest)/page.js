'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useGuest } from '@/lib/guestContext'
import Logo from '@/components/Logo'

// Faint badminton court drawn behind the hero, as in the design.
function CourtLines() {
  const line = 'absolute border-paper/[.09]'
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-[34%] top-[14%] aspect-[13.4/6.1] w-[max(110vw,1000px)]"
    >
      <div className="absolute inset-0 border-2 border-paper/[.13]" />
      <div className={`${line} inset-x-0 top-[7.54%] border-t-2`} />
      <div className={`${line} inset-x-0 top-[92.46%] border-t-2`} />
      <div className={`${line} inset-y-0 left-[5.67%] border-l-2`} />
      <div className={`${line} inset-y-0 left-[35.22%] border-l-2`} />
      <div className={`${line} inset-y-0 left-[64.78%] border-l-2`} />
      <div className={`${line} left-0 top-1/2 w-[35.22%] border-t-2`} />
      <div className={`${line} left-[64.78%] right-0 top-1/2 border-t-2`} />
      <div className="absolute -bottom-[5%] -top-[5%] left-1/2 border-l-4 border-dotted border-yellow/40" />
    </div>
  )
}

const CARD_TITLE =
  'flex items-center justify-between gap-3 font-display text-[32px] font-black uppercase leading-none'

export default function WelcomePage() {
  const router = useRouter()
  const { status, guest } = useGuest()

  // A recognised device skips the entry form entirely.
  useEffect(() => {
    if (guest) router.replace('/activities')
  }, [guest, router])

  const checking = status === 'checking' || !!guest

  return (
    <div className="relative flex min-h-screen flex-1 flex-col overflow-hidden bg-navy-deep text-paper">
      <CourtLines />

      <header className="relative flex items-center justify-between gap-4 px-[clamp(20px,5vw,56px)] py-5">
        <div className="flex items-center gap-3">
          <Logo size={44} />
          <span className="font-display text-[22px] font-black uppercase tracking-[.06em]">Court Call</span>
        </div>
        <div className="text-[14px] text-paper/[.72]">PENS Badminton Club</div>
      </header>

      <main className="relative flex w-full max-w-[1200px] flex-1 flex-col justify-center gap-7 px-[clamp(20px,5vw,56px)] pb-14 pt-4">
        <h1 className="m-0 font-display text-[clamp(92px,17vw,236px)] font-black uppercase leading-[.8] tracking-[-.01em]">
          Court
          <br />
          <span className="text-yellow">Call</span>
        </h1>
        <p className="m-0 max-w-[520px] text-pretty text-[clamp(17px,2vw,20px)] leading-[1.45] text-paper/[.84]">
          Book a spot, scan to pay, and wait for your name — no more scrolling the group chat to find out who’s next.
        </p>

        {checking ? (
          <div role="status" className="flex min-h-[118px] items-center gap-3 text-[15px] text-paper/[.75]">
            <span
              aria-hidden="true"
              className="size-5 animate-spin rounded-full border-[3px] border-paper/25 border-t-yellow"
            />
            {guest ? `Welcome back, ${guest.name.split(' ')[0]} — opening activities…` : 'Checking this device…'}
          </div>
        ) : (
          <div className="flex max-w-[780px] flex-wrap gap-3.5">
            <Link
              href="/join"
              className="cc-focus-on-dark flex flex-[1_1_300px] flex-col gap-2 rounded-2xl bg-yellow px-[22px] pb-5 pt-[22px] text-navy-deep no-underline hover:bg-yellow-hover"
            >
              <span className={CARD_TITLE}>
                <span>I’m here to play</span>
                <span aria-hidden="true">→</span>
              </span>
              <span className="text-[15px] leading-[1.4]">Quick check-in with your NRP — no account, no password.</span>
            </Link>
            <Link
              href="/login"
              className="cc-focus-on-dark flex flex-[1_1_300px] flex-col gap-2 rounded-2xl border-[1.5px] border-paper/[.32] px-[22px] pb-5 pt-[22px] text-paper no-underline hover:bg-paper/[.06]"
            >
              <span className={CARD_TITLE}>
                <span>Admin desk</span>
                <span aria-hidden="true">→</span>
              </span>
              <span className="text-[15px] leading-[1.4] text-paper/75">
                Create activities, run courts and the queue, log scores.
              </span>
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
