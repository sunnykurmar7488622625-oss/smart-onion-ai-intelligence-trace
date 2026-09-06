import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Search, ShieldCheck, ShieldX } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg } from "@/lib/api";
import { fmtDate, fmtDateTime, fmtQty, SOURCE_LABEL } from "@/lib/format";
import { GradeSummary } from "@/components/GradeSummary";
import { StatusBadge } from "@/components/StatusBadge";

export default function Verify() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get("id") || "");
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const lookup = async (e) => {
    e?.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError("");
    setRecord(null);
    try {
      const { data } = await api.get(`/verify/${encodeURIComponent(code.trim())}`);
      setRecord(data);
    } catch (err) {
      setError(errMsg(err, "No verified quality record found"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-50 glass border-b border-stone-200/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-8">
          <Logo />
          <Link to={user ? "/dashboard" : "/"} className="btn-secondary !py-2 !min-h-[44px] text-sm" data-testid="verify-back-link"><ArrowLeft size={16} /> {user ? "Dashboard" : "Home"}</Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 md:px-8 md:py-16">
        <div className="text-center max-w-2xl mx-auto animate-fade-up">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand"><ShieldCheck size={28} /></span>
          <h1 className="font-display mt-5 text-3xl md:text-4xl font-bold tracking-tight">Buyer Verification</h1>
          <p className="mt-3 text-stone-500 leading-relaxed">Enter a Batch ID (e.g. ON-2026-001) or a Verification ID from a quality report to see the trusted quality record.</p>
          <form onSubmit={lookup} className="mt-8 flex flex-col sm:flex-row gap-3" data-testid="verify-form">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
              <input className="field !pl-11 uppercase" placeholder="ON-2026-001 or OAI-XXXXXXXX" value={code} onChange={(e) => setCode(e.target.value)} data-testid="verify-code-input" />
            </div>
            <button type="submit" className="btn-primary text-base" disabled={busy || !code.trim()} data-testid="verify-submit-button">{busy ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />} Verify</button>
          </form>
        </div>

        {error && (
          <div className="mt-10 oa-card border-red-100 p-8 text-center max-w-xl mx-auto animate-fade-up" data-testid="verify-error">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600"><ShieldX size={24} /></span>
            <p className="font-display mt-4 text-xl font-bold">Record not found</p>
            <p className="mt-1 text-sm text-stone-500">{error}</p>
          </div>
        )}

        {record && (
          <div className="mt-10 space-y-6 animate-fade-up" data-testid="verify-result">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 flex items-center gap-4">
              <ShieldCheck className="text-emerald-600" size={28} />
              <div>
                <p className="font-display text-xl font-bold text-emerald-900">✓ Verified Quality Record</p>
                <p className="text-sm text-emerald-800">Verification ID {record.verification_id} · issued by ONIONAI · last checked {fmtDateTime(record.inspection_date)}</p>
              </div>
            </div>
            <div className="oa-card p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                  <p className="eyebrow">Batch</p>
                  <p className="font-display text-3xl font-bold">{record.batch_id}</p>
                  <p className="text-stone-500">{record.variety} · {fmtQty(record.quantity, record.unit)} · {record.supplier}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={record.overall_status} className="!text-sm !px-4 !py-1.5" testId="verify-status" />
                  <StatusBadge status={record.batch_status} />
                </div>
              </div>
              <GradeSummary metrics={record} />
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {[["Last checked", fmtDate(record.inspection_date)], ["Inspection source", SOURCE_LABEL[record.inspection_source]], ["Procurement center", record.procurement_center], ["Dispatch status", record.dispatch?.label || "Not yet verified"], ["Human verification", record.human_verification.status.replace("_", " ")], ["Storage duration", `${record.storage_duration_days} days`], ["Storage trend", record.quality_trend ? record.quality_trend : "—"], ["Inspections", record.inspection_count]].map(([k, v]) => (
                  <div key={k}><p className="text-[10px] uppercase tracking-widest font-bold text-stone-500">{k}</p><p className="font-semibold mt-0.5 capitalize">{v}</p></div>
                ))}
              </div>
            </div>
            <div className="oa-card p-6 md:p-8">
              <h3 className="font-display text-lg font-bold mb-4">Storage History</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="verify-storage-history">
                {record.storage_history.map((s) => (
                  <div key={s.day} className="rounded-xl border border-stone-200 p-4">
                    <div className="flex items-center justify-between"><p className="font-bold">Day {s.day}</p><span className="text-xs text-stone-500">{fmtDate(s.date)}</span></div>
                    <p className="mt-2 text-sm"><span className="text-emerald-700 font-bold">Grade A {s.grade_a}%</span> · <span className="text-red-700 font-bold">Defect {s.defect_percentage}%</span></p>
                    <StatusBadge status={s.status} className="mt-2 !text-[10px] !px-2 !py-0.5" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
