import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, Camera, CheckCircle2, Loader2, NotebookPen, ScrollText } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg } from "@/lib/api";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { TrendChart } from "@/components/TrendChart";
import { ErrorState, Loader, PageHeader } from "@/components/States";

export default function StorageMonitoring() {
  const { batchId } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api.get(`/storage/${batchId}`).then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, [batchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addNote = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/storage/${batchId}`, { notes: note });
      setNote("");
      toast.success("Storage note saved");
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <Loader label="Loading storage history…" />;
  const { batch: b, records, trend, alert, storage_duration_days, latest } = data;
  const first = trend[0];
  const last = trend[trend.length - 1];
  const canAct = user.role === "farmer" && b.status !== "DISPATCHED";

  return (
    <div>
      <PageHeader eyebrow="Storage Monitoring" title={`${b.batch_id} in storage`} description="Day-wise AI monitoring tracks quality changes and helps detect deterioration early.">
        {canAct && <Link to={`/camera?batch=${b.batch_id}`} className="btn-primary" data-testid="storage-new-check-button"><Camera size={18} /> Add Day {b.storage_days + 1} Check</Link>}
        <Link to={`/batches/${b.batch_id}`} className="btn-secondary" data-testid="storage-passport-link"><ScrollText size={18} /> Passport</Link>
      </PageHeader>

      {alert ? (
        <div className={`mb-6 flex items-start gap-4 rounded-2xl border p-5 ${alert.severity === "high" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`} data-testid="storage-alert">
          <AlertTriangle className={alert.severity === "high" ? "text-red-600" : "text-amber-600"} size={24} />
          <div>
            <p className="font-display text-lg font-bold">{alert.message}</p>
            <p className="text-sm text-stone-700 mt-1">{alert.detail}</p>
          </div>
        </div>
      ) : trend.length > 1 ? (
        <div className="mb-6 flex items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5" data-testid="storage-stable">
          <CheckCircle2 className="text-emerald-600" size={24} />
          <div><p className="font-display text-lg font-bold">Quality is holding steady in storage</p><p className="text-sm text-stone-700 mt-1">No significant decline between Day {first.day} and Day {last.day}.</p></div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 stagger">
        <MetricCard label="Storage Duration" value={storage_duration_days} suffix=" days" testId="storage-duration" />
        <MetricCard label="Latest Grade A" value={latest?.grade_a ?? 0} suffix="%" tone="good" hint={first && last && trend.length > 1 ? `${(last.grade_a - first.grade_a).toFixed(1)} pts since Day ${first.day}` : undefined} testId="storage-latest-grade-a" />
        <MetricCard label="Latest Defect" value={latest?.defective ?? 0} suffix="%" tone="bad" hint={first && last && trend.length > 1 ? `${(last.defective - first.defective) >= 0 ? "+" : ""}${(last.defective - first.defective).toFixed(1)} pts since Day ${first.day}` : undefined} testId="storage-latest-defect" />
        <div className="oa-card p-5 md:p-6 flex flex-col gap-3">
          <span className="eyebrow">Latest status</span>
          <div className="flex flex-col gap-2 items-start"><StatusBadge status={latest?.status || "PENDING"} testId="storage-latest-status" />{b.quality_trend && <StatusBadge status={b.quality_trend} />}</div>
          <p className="text-sm text-stone-500">Last check {latest ? fmtDate(latest.inspected_at) : "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 oa-card p-6">
          <h3 className="font-display text-lg font-bold">Quality Trend</h3>
          <p className="text-sm text-stone-500 mb-4">Grade A and defect % for every storage day</p>
          {trend.length ? <TrendChart data={trend} height={280} testId="storage-chart" /> : <p className="py-16 text-center text-sm text-stone-500">No inspections yet for this batch.</p>}
        </div>
        <div className="oa-card p-6">
          <h3 className="font-display text-lg font-bold">Day-wise Timeline</h3>
          <ul className="mt-4 space-y-3" data-testid="storage-timeline">
            {records.length === 0 && <li className="text-sm text-stone-500 py-6 text-center">No storage records yet.</li>}
            {records.map((r) => (
              <li key={r.id} className={`rounded-xl border p-3 ${r.type === "NOTE" ? "border-stone-200 bg-subtle" : "border-stone-200 bg-white"}`} data-testid={`storage-record-day-${r.day}`}>
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm">Day {r.day} {r.type === "NOTE" && <span className="text-stone-400 font-normal">· note</span>}</p>
                  <span className="text-xs text-stone-500">{fmtDateTime(r.created_at)}</span>
                </div>
                {r.type === "INSPECTION" ? (
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <span className="text-emerald-700 font-bold">Grade A {r.grade_a}%</span>
                    <span className="text-red-700 font-bold">Defect {r.defect_percentage}%</span>
                    <StatusBadge status={r.status} className="!text-[10px] !px-2 !py-0.5 ml-auto" />
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-stone-600">{r.notes}</p>
                )}
                {r.type === "INSPECTION" && r.inspection_id && <Link to={`/inspections/${r.inspection_id}`} className="mt-1 inline-block text-xs font-semibold text-brand hover:underline">View result</Link>}
              </li>
            ))}
          </ul>
          {canAct && (
            <form onSubmit={addNote} className="mt-5 border-t border-stone-100 pt-4 space-y-2" data-testid="storage-note-form">
              <label className="label flex items-center gap-2"><NotebookPen size={16} /> Add storage note</label>
              <textarea className="field" rows={2} required placeholder="e.g. Humidity high, crates rearranged" value={note} onChange={(e) => setNote(e.target.value)} data-testid="storage-note-input" />
              <button type="submit" disabled={busy} className="btn-secondary w-full" data-testid="storage-note-submit">{busy && <Loader2 size={16} className="animate-spin" />} Save note</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
