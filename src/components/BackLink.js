import Link from 'next/link'

export default function BackLink({ href = '/activities', children = '← All activities' }) {
  return (
    <Link
      href={href}
      className="cc-focus self-start rounded-md text-[14px] font-semibold text-navy no-underline hover:underline"
    >
      {children}
    </Link>
  )
}
