import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { BadgeCheck, FileText, LineChart, ScrollText, XCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import { InspectionResultView } from "@/components/InspectionResultView";
import { StatusBadge } from "@/components/StatusBadge";
import { ErrorState, Loader, PageHeader } from "@/components/States";

export default function InspectionResult() {
  const { inspectionId } = useParams();
  const { user } = useAuth();
  const [insp, setInsp] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api.get(`/inspections/one/${inspectionId}`).then((r) => setInsp(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, [inspectionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const verify = async (status) => {
    setBusy(true);
    try {
      const { data } = await api.put(`/inspections/${inspectionId}/verify`, { status });
      setInsp({ ...insp, ...data });
      toast.success(status === "VERIFIED" ? "Marked as human verified" : "Inspection rejected — please reinspect");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!insp) return <Loader label="Loading inspection…" />;

  return (
    <div>
      <PageHeader eyebrow={`Inspection · ${fmtDateTime(insp.created_at)}`} title={`${insp.batch_id} · Day ${insp.inspection_day}`} description={`${insp.batch.variety} · ${insp.batch.quantity} ${insp.batch.unit} · ${insp.batch.procurement_center}`}>
        <Link to={`/batches/${insp.batch_id}`} className="btn-secondary" data-testid="view-passport-link"><ScrollText size={18} /> Digital Passport</Link>
        <Link to={`/batches/${insp.batch_id}/storage`} className="btn-secondary" data-testid="view-storage-link"><LineChart size={18} /> Storage</Link>
        <Link to={`/reports/${insp.batch_id}`} className="btn-primary" data-testid="view-report-link"><FileText size={18} /> View Report</Link>
      </PageHeader>

      <InspectionResultView result={insp}>
        <div className="flex flex-col items-end gap-2" data-testid="human-verification">
          <StatusBadge status={insp.verification_status} testId="verification-status-badge" />
          {insp.verified_by_name && <p className="text-xs text-stone-500">by {insp.verified_by_name} · {fmtDateTime(insp.verified_at)}</p>}
          {user.role === "farmer" && insp.verification_status === "PENDING" && (
            <div className="flex gap-2">
              <button onClick={() => verify("VERIFIED")} disabled={busy} className="btn-accent !py-2 !min-h-[44px] text-sm" data-testid="verify-approve-button"><BadgeCheck size={16} /> Confirm result</button>
              <button onClick={() => verify("REJECTED")} disabled={busy} className="btn-secondary !py-2 !min-h-[44px] text-sm" data-testid="verify-reject-button"><XCircle size={16} /> Reject</button>
            </div>
          )}
        </div>
      </InspectionResultView>
      {insp.notes && <p className="mt-6 text-sm text-stone-600"><span className="font-semibold">Notes:</span> {insp.notes}</p>}
    </div>
  );
}
