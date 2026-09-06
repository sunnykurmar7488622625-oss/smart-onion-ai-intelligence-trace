import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, Loader2, RotateCcw, Truck, ScrollText } from "lucide-react";
import { api, errMsg } from "@/lib/api";
import { fmtDateTime, SOURCE_LABEL } from "@/lib/format";
import { GradeSummary } from "@/components/GradeSummary";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState, ErrorState, Loader, PageHeader } from "@/components/States";

export default function Dispatch() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [storage, setStorage] = useState(null);
  const [error, setError] = useState("");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () =>
    Promise.all([api.get(`/batches/${batchId}`), api.get(`/storage/${batchId}`)])
      .then(([b, s]) => { setData(b.data); setStorage(s.data); })
      .catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, [batchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const decide = async (status) => {
    setBusy(true);
    try {
      await api.post(`/dispatch/${batchId}/verify`, { status, remarks });
      toast.success(status === "APPROVED" ? "Batch approved for dispatch" : "Reinspection requested");
      setRemarks("");
      load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const complete = async () => {
    setBusy(true);
    try {
      await api.post(`/dispatch/${batchId}/complete`);
      toast.success("Batch marked as dispatched");
      navigate(`/batches/${batchId}`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data || !storage) return <Loader label="Preparing dispatch verification…" />;
  const { latest_inspection: li, previous_inspection: pi, dispatch_verification: dv } = data;

  if (!li) return <EmptyState icon={Truck} title="Inspect before dispatch" description="This batch has no quality inspection yet. Run a camera or image check first." action="Check Onion Quality" actionTo={`/camera?batch=${batchId}`} />;

  return (
    <div>
      <PageHeader eyebrow="Pre-Dispatch Verification" title={`Final check · ${data.batch_id}`} description="Confirm the latest quality before the lot leaves storage. Your decision is saved to the batch passport.">
        <Link to={`/batches/${data.batch_id}`} className="btn-secondary" data-testid="dispatch-passport-link"><ScrollText size={18} /> Passport</Link>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="oa-card p-6">
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <StatusBadge status={li.overall_status} testId="dispatch-latest-status" />
              <span className="text-sm text-stone-500">Latest inspection · Day {li.inspection_day} · {SOURCE_LABEL[li.source]} · {fmtDateTime(li.created_at)}</span>
            </div>
            <GradeSummary metrics={li} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="oa-card p-5"><p className="eyebrow">Storage duration</p><p className="font-display text-3xl font-bold mt-2" data-testid="dispatch-storage-duration">{storage.storage_duration_days} <span className="text-base text-stone-400">days</span></p></div>
            <div className="oa-card p-5"><p className="eyebrow">Last inspection</p><p className="font-display text-xl font-bold mt-2">{fmtDateTime(li.created_at)}</p></div>
            <div className="oa-card p-5">
              <p className="eyebrow">Previous result</p>
              {pi ? <p className="font-display text-xl font-bold mt-2">Day {pi.inspection_day}: Grade A {pi.grade_a}% <span className={`text-sm ${li.grade_a - pi.grade_a < 0 ? "text-red-700" : "text-emerald-700"}`}>({li.grade_a - pi.grade_a >= 0 ? "+" : ""}{(li.grade_a - pi.grade_a).toFixed(1)})</span></p> : <p className="font-display text-xl font-bold mt-2 text-stone-400">First inspection</p>}
            </div>
          </div>
          {storage.alert && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5" data-testid="dispatch-alert"><p className="font-bold">{storage.alert.message}</p><p className="text-sm text-stone-700 mt-1">{storage.alert.detail}</p></div>}
        </div>

        <div className="space-y-6">
          <div className="oa-card p-6" data-testid="dispatch-decision-panel">
            <h3 className="font-display text-lg font-bold">Decision</h3>
            <div className="mt-3 flex items-center gap-2"><span className="text-sm text-stone-500">Current:</span><StatusBadge status={data.status} testId="dispatch-batch-status" /></div>
            {data.status === "DISPATCHED" ? (
              <p className="mt-4 text-sm text-stone-600">This batch was dispatched on {fmtDateTime(data.dispatched_at)}.</p>
            ) : (
              <>
                <textarea className="field mt-4" rows={3} placeholder="Remarks (optional)" value={remarks} onChange={(e) => setRemarks(e.target.value)} data-testid="dispatch-remarks-input" />
                <div className="mt-3 flex flex-col gap-2">
                  <button onClick={() => decide("APPROVED")} disabled={busy} className="btn-accent w-full text-base" data-testid="approve-dispatch-button">{busy ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} Approve for Dispatch</button>
                  <button onClick={() => decide("REINSPECTION_REQUIRED")} disabled={busy} className="btn-secondary w-full" data-testid="require-reinspection-button"><RotateCcw size={18} /> Requires Reinspection</button>
                </div>
                {data.status === "DISPATCH_APPROVED" && (
                  <button onClick={complete} disabled={busy} className="btn-primary w-full mt-4" data-testid="mark-dispatched-button"><Truck size={18} /> Mark as Dispatched</button>
                )}
              </>
            )}
          </div>
          {dv && (
            <div className="oa-card p-6" data-testid="dispatch-last-verification">
              <p className="eyebrow">Last verification</p>
              <div className="mt-2 flex items-center gap-2"><StatusBadge status={dv.status} /><span className="text-xs text-stone-500">{fmtDateTime(dv.verified_at)}</span></div>
              <p className="text-sm text-stone-600 mt-2">by {dv.verified_by_name}{dv.remarks ? ` — ${dv.remarks}` : ""}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
