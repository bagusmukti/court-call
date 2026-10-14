'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo from '@/components/Logo'

export function initials(name, fallback = '?') {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return fallback
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase()
}

// The design's app shell: navy sidebar from 880px up; sticky header (plus a
// bottom tab bar when there is more than one destination) below that.
//   nav:    [{ href, label, short }]
//   user:   { name, sub, initials }
//   action: { label, onClick, busy, busyLabel } — the button under the user card
export default function AppShell({ navLabel, nav, user, action, children }) {
  const pathname = usePathname()
  const showTabBar = nav.length > 1
  const actionText = action.busy ? action.busyLabel : action.label

  return (
    <>
      <div className="flex min-h-screen flex-1">
        <aside className="sticky top-0 hidden h-screen w-[244px] shrink-0 flex-col gap-[26px] bg-navy-deep px-4 pb-[18px] pt-[26px] text-paper min-[880px]:flex">
          <div className="flex items-center gap-3 px-1.5">
            <Logo size={56} />
            <div className="font-display text-[34px] font-black uppercase leading-[.84]">
              Court
              <br />
              Call
            </div>
          </div>

          <nav aria-label={navLabel} className="flex flex-col gap-1">
            {nav.map((item) => {
              const on = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={on ? 'page' : undefined}
                  className={`cc-focus-on-dark flex min-h-12 items-center rounded-[10px] px-3 font-display text-[21px] font-extrabold uppercase tracking-[.03em] no-underline ${
                    on ? 'bg-yellow text-navy-deep' : 'text-paper/[.78] hover:bg-paper/[.06] hover:text-paper'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-auto flex flex-col gap-3 rounded-xl bg-paper/[.06] px-3 py-3.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                aria-hidden="true"
                className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-yellow font-display text-[17px] font-black text-navy-deep"
              >
                {user.initials}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[14px] font-semibold">{user.name}</div>
                <div className="truncate text-[12px] text-paper/[.62]">{user.sub}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={action.onClick}
              disabled={action.busy}
              className="cc-focus-on-dark min-h-10 cursor-pointer rounded-lg border border-paper/25 bg-transparent text-[13px] font-semibold text-paper hover:bg-paper/[.08] disabled:cursor-wait disabled:opacity-60"
            >
              {actionText}
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 bg-navy-deep px-4 py-2.5 text-paper min-[880px]:hidden">
            <div className="flex items-center gap-2.5">
              <Logo size={36} />
              <span className="font-display text-[26px] font-black uppercase tracking-[.02em]">Court Call</span>
            </div>
            <button
              type="button"
              onClick={action.onClick}
              disabled={action.busy}
              className="cc-focus-on-dark flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-paper/[.22] bg-transparent py-0 pl-3 pr-1.5 text-[13px] font-semibold text-paper disabled:cursor-wait disabled:opacity-60"
            >
              <span>{actionText}</span>
              <span
                aria-hidden="true"
                className="flex size-8 items-center justify-center rounded-full bg-yellow font-display text-[15px] font-black text-navy-deep"
              >
                {user.initials}
              </span>
            </button>
          </header>

          <main
            className={`mx-auto w-full max-w-[1320px] flex-1 px-[clamp(14px,3vw,40px)] pt-[clamp(18px,3vw,40px)] min-[880px]:pb-14 ${
              showTabBar ? 'pb-[104px]' : 'pb-14'
            }`}
          >
            {children}
          </main>
        </div>
      </div>

      {showTabBar ? (
        <nav
          aria-label={navLabel}
          className="fixed inset-x-0 bottom-0 z-30 flex gap-0.5 border-t border-paper/10 bg-navy-deep px-1.5 pb-[calc(4px+env(safe-area-inset-bottom))] pt-1 min-[880px]:hidden"
        >
          {nav.map((item) => {
            const on = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={on ? 'page' : undefined}
                className={`cc-focus-on-dark flex min-h-[58px] min-w-0 flex-1 flex-col items-center justify-center gap-1.5 font-display text-[16px] font-extrabold uppercase tracking-[.05em] no-underline ${
                  on ? 'text-yellow' : 'text-paper/50'
                }`}
              >
                <span className={`h-[3px] w-[22px] rounded-sm ${on ? 'bg-yellow' : 'bg-transparent'}`} />
                <span>{item.short}</span>
              </Link>
            )
          })}
        </nav>
      ) : null}
    </>
  )
}
