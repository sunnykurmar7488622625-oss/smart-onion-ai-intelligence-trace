import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Download, Loader2, Printer, ScrollText } from "lucide-react";
import { api, errMsg } from "@/lib/api";
import { fmtDate, fmtDateTime, fmtQty, QUALITY_LABELS, SOURCE_LABEL } from "@/lib/format";
import { LogoMark } from "@/components/Logo";
import { StatusBadge } from "@/components/StatusBadge";
import { ErrorState, Loader, PageHeader } from "@/components/States";

export const ReportDocument = ({ r }) => (
  <article className="print-area oa-card p-6 md:p-10 max-w-4xl mx-auto" data-testid="report-document">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-brand pb-6">
      <div className="flex items-center gap-3">
        <LogoMark size={44} />
        <div>
          <p className="font-display text-2xl font-bold tracking-tight">ONION<span className="text-brand-accent">AI</span></p>
          <p className="text-xs text-stone-500">Smart Quality. Trusted Trade. · Standardized Digital Quality Report</p>
        </div>
      </div>
      <div className="text-right flex flex-col items-end gap-2">
        <StatusBadge status={r.overall_status} className="!text-sm !px-4 !py-1.5" testId="report-status" />
        <p className="font-mono text-xs text-stone-500">Verification ID <span className="font-bold text-ink" data-testid="report-verification-id">{r.verification_id}</span></p>
        {r.qr_code && (
          <div className="flex items-center gap-3 rounded-xl border border-stone-200 p-2" data-testid="report-qr">
            <img src={`data:image/png;base64,${r.qr_code}`} alt="QR code to verify this report" className="h-24 w-24" data-testid="report-qr-image" />
            <p className="max-w-[120px] text-left text-[11px] leading-snug text-stone-500">Scan to open the verified record on any phone</p>
          </div>
        )}
      </div>
    </header>

    <section className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 py-6 text-sm">
      {[["Batch ID", r.batch_id], ["Farmer / Supplier", r.supplier], ["Procurement center", r.procurement_center], ["Onion variety", r.variety], ["Quantity", fmtQty(r.quantity, r.unit)], ["Storage location", r.storage_location || "—"], ["Inspection date", fmtDateTime(r.inspection_date)], ["Inspection source", `${SOURCE_LABEL[r.inspection_source]} (${r.inspection_source})`]].map(([k, v]) => (
        <div key={k}><p className="text-[10px] uppercase tracking-widest font-bold text-stone-500">{k}</p><p className="font-semibold mt-0.5">{v}</p></div>
      ))}
    </section>

    <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[["Grade A", r.grade_a, "text-emerald-700 bg-emerald-50 border-emerald-100"], ["URS (Under/Over-size)", r.urs, "text-amber-700 bg-amber-50 border-amber-100"], ["Good Quality", r.good_quality, "text-brand bg-brand-soft border-brand/10"], ["Defective", r.defective, "text-red-700 bg-red-50 border-red-100"]].map(([k, v, c]) => (
        <div key={k} className={`rounded-2xl border p-4 ${c}`}><p className="text-[10px] uppercase tracking-widest font-bold text-stone-500">{k}</p><p className="font-display text-3xl font-bold mt-1">{v}%</p></div>
      ))}
    </section>

    <section className="mt-6">
      <h3 className="eyebrow mb-3">Quality breakdown</h3>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {QUALITY_LABELS.map((q) => (
          <div key={q.key} className="rounded-xl border border-stone-200 p-3 text-center"><span className="mx-auto block h-2 w-2 rounded-full" style={{ background: q.color }} /><p className="text-xs text-stone-500 mt-1">{q.label}</p><p className="font-display font-bold text-lg">{r.percentages[q.key]}%</p></div>
        ))}
      </div>
    </section>

    <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="rounded-2xl bg-subtle p-5">
        <h3 className="eyebrow mb-2">AI assessment summary</h3>
        <p className="text-sm leading-relaxed text-stone-700">{r.ai_summary}</p>
        <p className="mt-3 text-xs text-stone-500">{r.total_detected} onions analysed · {r.images_analyzed} images · Engine: {r.ai_provider}</p>
      </div>
      <div className="rounded-2xl bg-subtle p-5 space-y-3">
        <div>
          <h3 className="eyebrow mb-2">Human verification</h3>
          <StatusBadge status={r.human_verification.status} />
          {r.human_verification.verified_by_name && <p className="text-xs text-stone-500 mt-1">{r.human_verification.verified_by_name} · {fmtDateTime(r.human_verification.verified_at)}{r.human_verification.remarks ? ` — ${r.human_verification.remarks}` : ""}</p>}
        </div>
        <div>
          <h3 className="eyebrow mb-2">Dispatch status</h3>
          <p className="text-sm font-semibold">{r.dispatch?.label || "Not yet verified for dispatch"}</p>
          {r.dispatch?.remarks && <p className="text-xs text-stone-500">{r.dispatch.remarks}</p>}
        </div>
      </div>
    </section>

    <section className="mt-6">
      <div className="flex items-center justify-between mb-3"><h3 className="eyebrow">Storage history</h3><span className="text-xs text-stone-500">{r.storage_duration_days} day(s) in storage · trend: <b className="capitalize">{r.quality_trend || "—"}</b></span></div>
      <table className="w-full text-sm" data-testid="report-storage-table">
        <thead><tr className="text-left text-[10px] uppercase tracking-widest text-stone-500 border-b border-stone-200"><th className="py-2">Day</th><th className="py-2">Date</th><th className="py-2">Grade A</th><th className="py-2">URS</th><th className="py-2">Good</th><th className="py-2">Defect</th><th className="py-2">Status</th></tr></thead>
        <tbody className="divide-y divide-stone-100">
          {r.storage_history.map((s) => (
            <tr key={s.day}><td className="py-2 font-bold">Day {s.day}</td><td className="py-2">{fmtDate(s.date)}</td><td className="py-2 text-emerald-700 font-semibold">{s.grade_a}%</td><td className="py-2">{s.urs}%</td><td className="py-2">{s.quality_percentage}%</td><td className="py-2 text-red-700 font-semibold">{s.defect_percentage}%</td><td className="py-2"><StatusBadge status={s.status} className="!text-[10px] !px-2 !py-0.5" /></td></tr>
          ))}
        </tbody>
      </table>
    </section>

    <footer className="mt-8 border-t border-stone-200 pt-4 text-xs text-stone-500 leading-relaxed">
      Generated {fmtDateTime(r.generated_at)} · Verification ID {r.verification_id}. AI-Assisted Onion Quality Assessment — results are estimates from visible characteristics and are not 100% accurate; human verification status is shown above. Verify this record at the ONIONAI Buyer Verification page using the Batch ID or Verification ID.
    </footer>
  </article>
);

export default function ReportView() {
  const { batchId } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  const load = () => api.get(`/reports/${batchId}`).then((r) => setReport(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, [batchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const download = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/reports/${batchId}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ONIONAI-${batchId}-quality-report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded");
    } catch (e) {
      toast.error(errMsg(e, "Could not download the PDF"));
    } finally {
      setDownloading(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!report) return <Loader label="Generating report…" />;

  return (
    <div>
      <div className="no-print">
        <PageHeader eyebrow="Standardized Digital Quality Report" title={`Report · ${report.batch_id}`} description="Print-ready and downloadable. Share the Verification ID with buyers so they can confirm this record.">
          <Link to={`/batches/${report.batch_id}`} className="btn-secondary" data-testid="report-passport-link"><ScrollText size={18} /> Passport</Link>
          <button onClick={() => window.print()} className="btn-secondary" data-testid="print-report-button"><Printer size={18} /> Print</button>
          <button onClick={download} disabled={downloading} className="btn-primary" data-testid="download-report-button">{downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} Download Report (PDF)</button>
        </PageHeader>
      </div>
      <ReportDocument r={report} />
    </div>
  );
}
