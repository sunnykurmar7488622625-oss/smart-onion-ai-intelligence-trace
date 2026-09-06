import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { api, errMsg } from "@/lib/api";
import { fmtDate, fmtQty } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState, ErrorState, Loader, PageHeader } from "@/components/States";

export default function Reports() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const load = () => api.get("/reports").then((r) => setRows(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!rows) return <Loader label="Loading reports…" />;

  return (
    <div>
      <PageHeader eyebrow="Standardized Digital Reports" title="Quality Reports" description="Every inspected batch has one standard report with Grade A, URS, defect breakdown, storage history and a Verification ID." />
      {rows.length === 0 ? (
        <EmptyState icon={FileText} title="No reports yet" description="Reports are generated automatically after the first inspection of a batch." action="Check Onion Quality" actionTo="/camera" />
      ) : (
        <div className="oa-card overflow-x-auto">
          <table className="w-full text-sm" data-testid="reports-table">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-stone-500 border-b border-stone-100 bg-subtle/60">
                <th className="px-6 py-3 font-bold">Batch</th><th className="px-4 py-3 font-bold">Verification ID</th><th className="px-4 py-3 font-bold">Grade A</th><th className="px-4 py-3 font-bold">URS</th><th className="px-4 py-3 font-bold">Defective</th><th className="px-4 py-3 font-bold">Quality</th><th className="px-4 py-3 font-bold">Updated</th><th className="px-6 py-3 font-bold text-right">Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((r) => (
                <tr key={r.batch_id} className="hover:bg-subtle/60 transition-colors" data-testid={`report-row-${r.batch_id}`}>
                  <td className="px-6 py-4 font-bold">{r.batch_id}<p className="text-xs font-normal text-stone-500">{r.variety} · {fmtQty(r.quantity, r.unit)}</p></td>
                  <td className="px-4 py-4 font-mono text-xs">{r.verification_id}</td>
                  <td className="px-4 py-4 font-semibold text-emerald-700">{r.latest?.grade_a}%</td>
                  <td className="px-4 py-4 font-semibold text-amber-700">{r.latest?.urs}%</td>
                  <td className="px-4 py-4 font-semibold text-red-700">{r.latest?.defective}%</td>
                  <td className="px-4 py-4"><StatusBadge status={r.latest?.status} /></td>
                  <td className="px-4 py-4 text-stone-600">{fmtDate(r.updated_at)}</td>
                  <td className="px-6 py-4 text-right"><Link to={`/reports/${r.batch_id}`} className="font-semibold text-brand hover:underline" data-testid={`open-report-${r.batch_id}`}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
