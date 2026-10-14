import { GuestProvider } from '@/lib/guestContext'

export default function GuestLayout({ children }) {
  return <GuestProvider>{children}</GuestProvider>
}
