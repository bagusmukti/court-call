'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Tabs between an activity's live board and its match history (guest side).
export default function LiveTabs({ activityId, aside }) {
  const pathname = usePathname()
  const tabs = [
    { href: `/activities/${activityId}/live`, label: 'Live board' },
    { href: `/activities/${activityId}/history`, label: 'Match history' },
  ]
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <nav aria-label="Session views" className="flex gap-1 rounded-xl bg-line-soft p-1">
        {tabs.map((t) => {
          const on = pathname === t.href
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={on ? 'page' : undefined}
              className={`cc-focus inline-flex min-h-[42px] items-center rounded-[9px] px-4 font-display text-[16px] font-extrabold uppercase tracking-[.06em] no-underline ${
                on ? 'bg-navy-deep text-yellow' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {t.label}
            </Link>
          )
        })}
      </nav>
      {aside}
    </div>
  )
}
