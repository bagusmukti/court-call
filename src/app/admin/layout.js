'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { AdminContext } from '@/lib/adminContext'
import AppShell, { initials } from '@/components/AppShell'
import PageStatus from '@/components/PageStatus'

const NAV = [
  { href: '/admin', label: 'Dashboard', short: 'Dashboard' },
  { href: '/admin/activities/new', label: 'Create activity', short: 'New activity' },
]

export default function AdminLayout({ children }) {
  const router = useRouter()
  const [admin, setAdmin] = useState(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    let active = true

    async function verify() {
      const { data, error } = await supabase.auth.getSession()
      const session = data?.session
      if (!active) return
      if (error || !session) {
        router.replace('/login')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('id', session.user.id)
        .maybeSingle()
      if (!active) return
      if (profileError || profile?.role !== 'admin') {
        router.replace('/login')
        return
      }
      setAdmin(profile)
    }

    verify()

    // Covers sign-out from another tab and expired sessions.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/login')
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [router])

  async function logOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (!admin) return <PageStatus>Checking your access…</PageStatus>

  return (
    <AdminContext.Provider value={admin}>
      <AppShell
        navLabel="Admin"
        nav={NAV}
        user={{ name: admin.name, sub: 'Admin desk', initials: initials(admin.name, 'AD') }}
        action={{ label: 'Log out', busyLabel: 'Logging out…', busy: signingOut, onClick: logOut }}
      >
        {children}
      </AppShell>
    </AdminContext.Provider>
  )
}
