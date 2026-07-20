export function StatusBadge({ status }: { status: string }) {
  return <span className="inline-flex rounded-full border border-gold/20 bg-gold/10 px-2.5 py-1 text-xs text-gold">{status}</span>
}
