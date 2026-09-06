import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Boxes, Plus, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg } from "@/lib/api";
import { fmtDate, fmtQty } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState, ErrorState, Loader, PageHeader } from "@/components/States";

export default function Batches() {
  const { user } = useAuth();
  const [batches, setBatches] = useState(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const isFarmer = user.role === "farmer";

  const load = () => api.get("/batches").then((r) => setBatches(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!batches) return <Loader label="Loading batches…" />;

  const shown = batches.filter((b) => `${b.batch_id} ${b.variety} ${b.procurement_center} ${b.supplier_name}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader eyebrow="Batch Management" title={isFarmer ? "My Onion Batches" : "Inspected Batches"} description={isFarmer ? "Every lot you register keeps its full inspection, storage and dispatch history." : "Batches with quality records shared by suppliers."}>
        {isFarmer && <Link to="/batches/new" className="btn-primary" data-testid="create-batch-button"><Plus size={18} /> Create Onion Batch</Link>}
      </PageHeader>

      <div className="relative mb-6 max-w-md">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
        <input className="field !pl-11" placeholder="Search batch ID, variety or center" value={q} onChange={(e) => setQ(e.target.value)} data-testid="batch-search-input" />
      </div>

      {batches.length === 0 ? (
        <EmptyState icon={Boxes} title="No batches yet" description={isFarmer ? "Create your first onion batch, then scan it with the camera to get Grade A and URS results." : "No supplier has shared inspected batches yet."} action={isFarmer ? "Create Onion Batch" : undefined} actionTo="/batches/new" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 stagger" data-testid="batch-list">
          {shown.map((b) => (
            <Link key={b.batch_id} to={`/batches/${b.batch_id}`} className="oa-card oa-card-hover p-6 flex flex-col gap-4" data-testid={`batch-card-${b.batch_id}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl font-bold">{b.batch_id}</p>
                  <p className="text-sm text-stone-500">{b.variety} · {fmtQty(b.quantity, b.unit)}</p>
                </div>
                <StatusBadge status={b.status} />
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-subtle p-3 text-center">
                {[["Grade A", b.latest?.grade_a, "text-emerald-700"], ["URS", b.latest?.urs, "text-amber-700"], ["Defective", b.latest?.defective, "text-red-700"]].map(([k, v, c]) => (
                  <div key={k}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">{k}</p>
                    <p className={`font-display text-lg font-bold ${v == null ? "text-stone-400" : c}`}>{v == null ? "—" : `${v}%`}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>{b.procurement_center}</span>
                <span>{fmtDate(b.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                {b.is_demo && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">Demo data</span>}
                {b.quality_trend && <StatusBadge status={b.quality_trend} className="!text-[10px] !px-2 !py-0.5" />}
                <span className="ml-auto text-xs text-stone-500">{b.inspection_count} inspection{b.inspection_count === 1 ? "" : "s"}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
