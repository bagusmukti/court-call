// One label/value pair in a <dl> of activity details.
export default function DetailRow({ label, children }) {
  return (
    <div className="flex flex-col gap-[3px] border-t border-line-soft py-3 first:border-t-0 first:pt-0 last:pb-0">
      <dt className="text-[12px] font-semibold uppercase tracking-[.08em] text-muted">{label}</dt>
      <dd className="m-0 text-[16px] font-semibold leading-snug">{children}</dd>
    </div>
  )
}
