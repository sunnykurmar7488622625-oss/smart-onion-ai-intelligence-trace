import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { QUALITY_LABELS } from "@/lib/format";

export const QualityBreakdown = ({ percentages = {}, counts = {} }) => {
  const data = QUALITY_LABELS.map((q) => ({ ...q, value: percentages[q.key] || 0, count: counts[q.key] || 0 })).filter((d) => d.value > 0);
  return (
    <div className="oa-card p-6" data-testid="quality-breakdown">
      <h3 className="font-display text-lg font-bold">Quality Breakdown</h3>
      <p className="text-sm text-stone-500 mb-4">Share of onions in each visible quality group</p>
      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-6 items-center">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="label" innerRadius={58} outerRadius={90} paddingAngle={2} stroke="none">
                {data.map((d) => (
                  <Cell key={d.key} fill={d.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n, p) => [`${v}% (${p.payload.count})`, n]} contentStyle={{ borderRadius: 12, border: "1px solid #E7E5E4", fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="space-y-2.5">
          {QUALITY_LABELS.map((q) => (
            <li key={q.key} className="flex items-center gap-3" data-testid={`breakdown-${q.key}`}>
              <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: q.color }} />
              <span className="w-24 text-sm font-semibold text-stone-700">{q.label}</span>
              <div className="flex-1 h-2 rounded-full bg-subtle overflow-hidden">
                <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${percentages[q.key] || 0}%`, background: q.color }} />
              </div>
              <span className="w-14 text-right text-sm font-bold tabular-nums">{percentages[q.key] ?? 0}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
