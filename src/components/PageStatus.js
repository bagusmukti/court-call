// Full-page spinner shown while a session or guest profile is being checked.
export default function PageStatus({ children }) {
  return (
    <div
      role="status"
      className="flex min-h-screen flex-1 flex-col items-center justify-center gap-[18px] bg-paper p-6 text-center"
    >
      <div className="cc-spinner" aria-hidden="true" />
      <div className="font-display text-[30px] font-black uppercase leading-none">{children}</div>
    </div>
  )
}
