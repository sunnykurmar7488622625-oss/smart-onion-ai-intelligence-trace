import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Boxes, Camera, ClipboardCheck, FileText, LineChart, MapPin, Package, ScanEye, Truck, Warehouse, Activity, FileSignature } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg } from "@/lib/api";
import { fmtDate, fmtDateTime, fmtQty, SOURCE_LABEL } from "@/lib/format";
import { GradeSummary } from "@/components/GradeSummary";
import { StatusBadge } from "@/components/StatusBadge";
import { ErrorState, Loader, PageHeader } from "@/components/States";

const ICONS = { BATCH_CREATED: Boxes, INSPECTION: ScanEye, QUALITY_CHANGE: Activity, STORAGE_NOTE: Warehouse, DISPATCH_VERIFICATION: ClipboardCheck, DISPATCHED: Truck };
const TONES = { good: "bg-emerald-100 text-emerald-700", warn: "bg-amber-100 text-amber-700", bad: "bg-red-100 text-red-700", neutral: "bg-stone-100 text-stone-600" };

export default function BatchPassport() {
  const { batchId } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const isFarmer = user.role === "farmer";

  const load = () => api.get(`/batches/${batchId}/passport`).then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, [batchId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <Loader label="Opening digital passport…" />;
  const { batch: b, timeline } = data;
  const canAct = isFarmer && b.status !== "DISPATCHED";

  return (
    <div>
      <PageHeader eyebrow="Batch Digital Passport" title={b.batch_id} description={`${b.variety} · ${fmtQty(b.quantity, b.unit)} · ${b.supplier_name}`}>
        {canAct && <Link to={`/camera?batch=${b.batch_id}`} className="btn-primary" data-testid="passport-scan-button"><Camera size={18} /> {b.inspection_count ? `Day ${b.storage_days + 1} Check` : "First Inspection"}</Link>}
        {b.inspection_count > 0 && <Link to={`/batches/${b.batch_id}/storage`} className="btn-secondary" data-testid="passport-storage-link"><LineChart size={18} /> Storage</Link>}
        {b.inspection_count > 0 && <Link to={`/reports/${b.batch_id}`} className="btn-secondary" data-testid="passport-report-link"><FileText size={18} /> Report</Link>}
        {canAct && b.inspection_count > 0 && <Link to={`/batches/${b.batch_id}/dispatch`} className="btn-secondary" data-testid="passport-dispatch-link"><Truck size={18} /> Dispatch</Link>}
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="oa-card p-6">
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <StatusBadge status={b.status} testId="passport-status" />
              {b.quality_trend && <StatusBadge status={b.quality_trend} testId="passport-trend" />}
              {b.is_demo && <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-stone-500">Demo data</span>}
              {b.verification_id && <span className="ml-auto text-xs font-mono font-bold text-stone-500" data-testid="passport-verification-id">Verification ID · {b.verification_id}</span>}
            </div>
            {b.latest ? <GradeSummary metrics={b.latest} /> : (
              <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center">
                <p className="font-display text-lg font-bold">No inspection yet</p>
                <p className="text-sm text-stone-500 mt-1">Scan this batch with the camera or upload photos to get Grade A and URS results.</p>
              </div>
            )}
          </div>

          <div className="oa-card p-6">
            <h3 className="font-display text-lg font-bold mb-6">Complete Timeline</h3>
            <ol className="relative timeline-line space-y-6" data-testid="passport-timeline">
              {timeline.map((e, i) => {
                const Icon = ICONS[e.type] || Boxes;
                return (
                  <li key={i} className="relative flex gap-4 pl-0" data-testid={`timeline-${e.type.toLowerCase()}`}>
                    <span className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${TONES[e.tone]}`}><Icon size={18} /></span>
                    <div className="flex-1 pb-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold">{e.title}</p>
                        {e.status && <StatusBadge status={e.status} className="!text-[10px] !px-2 !py-0.5" />}
                        {e.source && <span className="text-xs text-stone-500">{SOURCE_LABEL[e.source]}</span>}
                        <span className="ml-auto text-xs text-stone-500">{fmtDateTime(e.at)}</span>
                      </div>
                      <p className="text-sm text-stone-600 mt-0.5">{e.detail}</p>
                      {e.inspection_id && <Link to={`/inspections/${e.inspection_id}`} className="text-sm font-semibold text-brand hover:underline">View result</Link>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <div className="space-y-6">
          <div className="oa-card p-6 space-y-4" data-testid="batch-details">
            <h3 className="font-display text-lg font-bold">Batch Details</h3>
            {[[Package, "Variety", b.variety], [Boxes, "Quantity", fmtQty(b.quantity, b.unit)], [FileSignature, "Supplier", b.supplier_name], [MapPin, "Procurement center", b.procurement_center], [Warehouse, "Storage", b.storage_location || "—"], [ClipboardCheck, "Inspection date", fmtDate(b.inspection_date)]].map(([Icon, k, v]) => (
              <div key={k} className="flex items-start gap-3">
                <Icon size={18} className="mt-0.5 text-stone-400" />
                <div><p className="text-xs uppercase tracking-wider font-bold text-stone-500">{k}</p><p className="font-semibold">{v}</p></div>
              </div>
            ))}
            {b.notes && <p className="text-sm text-stone-600 border-t border-stone-100 pt-3">{b.notes}</p>}
          </div>
          <div className="oa-card p-6">
            <h3 className="font-display text-lg font-bold">Storage Summary</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[["Inspections", b.inspection_count], ["Storage days", b.storage_days], ["Created", fmtDate(b.created_at)], ["Last check", b.latest ? fmtDate(b.latest.inspected_at) : "—"]].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-subtle p-3"><p className="text-[10px] uppercase tracking-widest font-bold text-stone-500">{k}</p><p className="font-display font-bold text-lg">{v}</p></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
