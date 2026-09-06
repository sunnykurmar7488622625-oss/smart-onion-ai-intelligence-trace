const TONES = {
  neutral: "text-ink",
  good: "text-emerald-700",
  warn: "text-amber-700",
  bad: "text-red-700",
  brand: "text-brand",
};

export const MetricCard = ({ label, value, suffix = "", hint, icon: Icon, tone = "neutral", testId }) => (
  <div className="oa-card oa-card-hover flex flex-col gap-3 p-5 md:p-6" data-testid={testId}>
    <div className="flex items-center justify-between">
      <span className="eyebrow">{label}</span>
      {Icon && (
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-subtle text-stone-600">
          <Icon size={18} />
        </span>
      )}
    </div>
    <p className={`font-display text-3xl md:text-4xl font-bold tracking-tight ${TONES[tone]}`}>
      {value}
      {suffix && <span className="text-xl font-semibold text-stone-400 ml-0.5">{suffix}</span>}
    </p>
    {hint && <p className="text-sm text-stone-500">{hint}</p>}
  </div>
);
