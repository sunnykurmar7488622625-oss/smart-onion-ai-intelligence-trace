const TILES = [
  { key: "grade_a", label: "Grade A", sub: "Premium market grade", bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" },
  { key: "urs", label: "URS", sub: "Under / Over-size", bar: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50 border-amber-100" },
  { key: "defective", label: "Defective", sub: "Damaged · Rotten · Sprouted", bar: "bg-red-500", text: "text-red-700", bg: "bg-red-50 border-red-100" },
  { key: "good_quality", label: "Good Quality", sub: "Marketable share", bar: "bg-brand", text: "text-brand", bg: "bg-brand-soft border-brand/10" },
];

export const GradeSummary = ({ metrics, compact = false }) => (
  <div className={`grid gap-4 ${compact ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2 lg:grid-cols-4"}`} data-testid="grade-summary">
    {TILES.map((t) => (
      <div key={t.key} className={`rounded-2xl border p-4 md:p-5 ${t.bg}`} data-testid={`grade-${t.key}`}>
        <p className="eyebrow">{t.label}</p>
        <p className={`font-display mt-2 text-3xl md:text-4xl font-bold tracking-tight ${t.text}`}>{metrics?.[t.key] ?? 0}%</p>
        <p className="mt-1 text-xs text-stone-500">{t.sub}</p>
        <div className="mt-3 h-2 rounded-full bg-white/70 overflow-hidden">
          <div className={`h-full rounded-full ${t.bar} transition-[width] duration-700`} style={{ width: `${Math.min(100, metrics?.[t.key] ?? 0)}%` }} />
        </div>
      </div>
    ))}
  </div>
);
