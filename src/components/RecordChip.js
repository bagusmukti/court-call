// A guest's all-time record, scoreboard-style: "Record 3 W – 1 L".
export default function RecordChip({ record }) {
  if (!record) return null
  return (
    <div
      className="inline-flex items-center gap-3 rounded-xl bg-navy-deep px-3.5 py-2 text-paper"
      aria-label={`Your record: ${record.wins} ${record.wins === 1 ? 'win' : 'wins'}, ${record.losses} ${record.losses === 1 ? 'loss' : 'losses'}`}
    >
      <span className="font-display text-[13px] font-extrabold uppercase tracking-[.14em] text-yellow">Record</span>
      <span className="font-display text-[24px] font-black leading-none tabular-nums" aria-hidden="true">
        {record.wins} W <span className="text-paper/50">–</span> {record.losses} L
      </span>
    </div>
  )
}
