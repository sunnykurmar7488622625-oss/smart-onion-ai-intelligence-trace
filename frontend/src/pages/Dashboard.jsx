import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Boxes, Camera, ClipboardCheck, FileText, ImagePlus, Percent, Plus, ScanEye, TrendingDown, ArrowRight, Hourglass } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg } from "@/lib/api";
import { fmtDate, fmtQty, SOURCE_LABEL } from "@/lib/format";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { TrendChart } from "@/components/TrendChart";
import { EmptyState, ErrorState, Loader, PageHeader } from "@/components/States";

const QUICK = [
  { to: "/camera", icon: Camera, title: "Check with Camera", text: "Scan onions live", primary: true, id: "camera" },
  { to: "/inspect", icon: ImagePlus, title: "Upload Image", text: "Analyse photos", id: "upload" },
  { to: "/batches/new", icon: Plus, title: "Create Batch", text: "Register a new lot", id: "create-batch" },
  { to: "/reports", icon: FileText, title: "View Reports", text: "Digital quality reports", id: "reports" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = () => {
    setError("");
    api.get("/dashboard/stats").then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  };
  useEffect(load, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <Loader label="Checking how your onions are doing…" />;
  const { totals: t, recent_batches, quality_trend, storage_trend, recent_inspections, alerts } = data;
  const isFarmer = user.role === "farmer";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-10">
      <PageHeader eyebrow={`${greeting}, ${user.name.split(" ")[0]}`} title="How are your onions doing?" description={isFarmer ? "Live summary of every batch you have registered, inspected and stored." : "Live summary of every inspected batch shared with buyers."} />

      {isFarmer && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger" data-testid="quick-actions">
          {QUICK.map(({ to, icon: Icon, title, text, primary, id }) => (
            <Link key={to} to={to} data-testid={`quick-action-${id}`} className={`oa-card oa-card-hover p-5 md:p-6 flex flex-col gap-4 min-h-[128px] ${primary ? "!bg-brand !border-brand text-white" : ""}`}>
              <span className={`flex h-11 w-11 items-center justify-center rounded-full ${primary ? "bg-white/15" : "bg-brand-soft text-brand"}`}><Icon size={22} /></span>
              <div>
                <p className="font-display font-bold text-base md:text-lg leading-tight">{title}</p>
                <p className={`text-sm ${primary ? "text-white/70" : "text-stone-500"}`}>{text}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger" data-testid="stats-grid">
        <MetricCard label="Total Batches" value={t.total_batches} icon={Boxes} testId="stat-total-batches" />
        <MetricCard label="Inspected" value={t.inspected_batches} icon={ScanEye} hint={`${t.pending_inspections} pending`} testId="stat-inspected" />
        <MetricCard label="Good Quality" value={t.good_quality} suffix="%" icon={Percent} tone="good" testId="stat-good-quality" />
        <MetricCard label="Grade A" value={t.grade_a} suffix="%" icon={ClipboardCheck} tone="good" testId="stat-grade-a" />
        <MetricCard label="URS" value={t.urs} suffix="%" hint="Under / over-size" tone="warn" testId="stat-urs" />
        <MetricCard label="Defective" value={t.defective} suffix="%" tone="bad" testId="stat-defective" />
        <MetricCard label="Storage Alerts" value={t.storage_alerts} icon={AlertTriangle} tone={t.storage_alerts ? "bad" : "neutral"} testId="stat-storage-alerts" />
        <MetricCard label="Pending Inspections" value={t.pending_inspections} icon={Hourglass} tone={t.pending_inspections ? "warn" : "neutral"} testId="stat-pending" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 oa-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-lg font-bold">Quality Trend</h3>
              <p className="text-sm text-stone-500">Grade A vs defects across your latest inspections</p>
            </div>
          </div>
          {quality_trend.length ? <TrendChart data={quality_trend} testId="quality-trend-chart" /> : <p className="py-16 text-center text-sm text-stone-500">No inspections yet — scan a batch to see the trend.</p>}
        </div>
        <div className="oa-card p-6 flex flex-col" data-testid="storage-alerts-panel">
          <div className="flex items-center gap-2">
            <TrendingDown size={18} className="text-red-600" />
            <h3 className="font-display text-lg font-bold">Storage Alerts</h3>
          </div>
          {alerts.length ? (
            <ul className="mt-4 space-y-3">
              {alerts.map((a) => (
                <li key={a.batch_id} className={`rounded-xl border p-4 ${a.severity === "high" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`} data-testid={`alert-${a.batch_id}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm">{a.batch_id} · {a.variety}</p>
                    {a.grade_a_drop > 0 && <span className="text-xs font-bold text-red-700">−{a.grade_a_drop} pts</span>}
                  </div>
                  <p className="mt-1 text-sm text-stone-700 leading-snug">{a.message}</p>
                  <Link to={`/batches/${a.batch_id}/storage`} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">View storage <ArrowRight size={14} /></Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><ClipboardCheck size={22} /></span>
              <p className="mt-3 font-semibold">All batches look stable</p>
              <p className="text-sm text-stone-500">Quality is holding across storage.</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 oa-card p-6">
          <h3 className="font-display text-lg font-bold">Storage Deterioration</h3>
          <p className="text-sm text-stone-500 mb-4">Average quality by storage day across all batches</p>
          {storage_trend.length ? <TrendChart data={storage_trend} height={240} testId="storage-trend-chart" /> : <p className="py-16 text-center text-sm text-stone-500">Storage trend appears after day-wise inspections.</p>}
        </div>
        <div className="oa-card p-6">
          <h3 className="font-display text-lg font-bold">Recent Inspections</h3>
          <ul className="mt-4 divide-y divide-stone-100" data-testid="recent-inspections">
            {recent_inspections.length === 0 && <li className="py-8 text-center text-sm text-stone-500">No inspections yet</li>}
            {recent_inspections.map((i) => (
              <li key={i.id}>
                <Link to={`/inspections/${i.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-subtle -mx-2 px-2 rounded-lg transition-colors">
                  <div>
                    <p className="font-bold text-sm">{i.batch_id} · Day {i.inspection_day}</p>
                    <p className="text-xs text-stone-500">{SOURCE_LABEL[i.source]} · {fmtDate(i.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-emerald-700">{i.grade_a}%</p>
                    <StatusBadge status={i.overall_status} className="!px-2 !py-0.5 !text-[10px]" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="oa-card overflow-hidden">
        <div className="flex items-center justify-between p-6 pb-4">
          <h3 className="font-display text-lg font-bold">Recent Batches</h3>
          <Link to="/batches" className="text-sm font-semibold text-brand hover:underline" data-testid="view-all-batches-link">View all</Link>
        </div>
        {recent_batches.length === 0 ? (
          <div className="p-6 pt-0"><EmptyState icon={Boxes} title="No batches yet" description="Create your first onion batch to start inspecting and tracking quality." action={isFarmer ? "Create Onion Batch" : undefined} actionTo="/batches/new" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="recent-batches-table">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-stone-500 border-y border-stone-100 bg-subtle/60">
                  <th className="px-6 py-3 font-bold">Batch ID</th><th className="px-4 py-3 font-bold">Date</th><th className="px-4 py-3 font-bold">Quantity</th><th className="px-4 py-3 font-bold">Grade</th><th className="px-4 py-3 font-bold">Good %</th><th className="px-4 py-3 font-bold">Defect %</th><th className="px-4 py-3 font-bold">Status</th><th className="px-6 py-3 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {recent_batches.map((b) => (
                  <tr key={b.batch_id} className="hover:bg-subtle/60 transition-colors" data-testid={`batch-row-${b.batch_id}`}>
                    <td className="px-6 py-4 font-bold">{b.batch_id}<p className="text-xs font-normal text-stone-500">{b.variety}</p></td>
                    <td className="px-4 py-4 text-stone-600">{fmtDate(b.created_at)}</td>
                    <td className="px-4 py-4">{fmtQty(b.quantity, b.unit)}</td>
                    <td className="px-4 py-4">{b.latest ? <StatusBadge status={b.latest.status} /> : <span className="text-stone-400">—</span>}</td>
                    <td className="px-4 py-4 font-semibold text-emerald-700">{b.latest ? `${b.latest.good_quality}%` : "—"}</td>
                    <td className="px-4 py-4 font-semibold text-red-700">{b.latest ? `${b.latest.defective}%` : "—"}</td>
                    <td className="px-4 py-4"><StatusBadge status={b.status} /></td>
                    <td className="px-6 py-4 text-right"><Link to={`/batches/${b.batch_id}`} className="font-semibold text-brand hover:underline">Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
