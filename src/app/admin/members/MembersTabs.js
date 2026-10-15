'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/members', label: 'Guests' },
  { href: '/admin/members/committee', label: 'Committee data' },
]

// Tabs between the guest directory and the committee attendance report.
export default function MembersTabs() {
  const pathname = usePathname()
  return (
    <nav aria-label="Member views" className="flex self-start rounded-xl bg-line-soft p-1">
      {TABS.map((t) => {
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
  )
}
