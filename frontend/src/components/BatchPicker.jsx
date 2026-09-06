import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { fmtQty } from "@/lib/format";

export const BatchPicker = ({ value, onChange }) => {
  const [batches, setBatches] = useState(null);

  useEffect(() => {
    api.get("/batches").then((r) => {
      const open = r.data.filter((b) => b.status !== "DISPATCHED");
      setBatches(open);
      if (!value && open.length && !open.some((b) => b.batch_id === value)) onChange(open[0].batch_id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (batches === null) return <div className="h-12 rounded-xl bg-subtle animate-pulse" />;
  if (!batches.length)
    return (
      <Link to="/batches/new" className="btn-secondary w-full" data-testid="batch-picker-create-link">
        <Plus size={18} /> Create your first batch
      </Link>
    );
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <select className="field flex-1" value={value || ""} onChange={(e) => onChange(e.target.value)} data-testid="batch-picker-select">
        {batches.map((b) => (
          <option key={b.batch_id} value={b.batch_id}>
            {b.batch_id} · {b.variety} · {fmtQty(b.quantity, b.unit)}
          </option>
        ))}
      </select>
      <Link to="/batches/new" className="btn-secondary whitespace-nowrap" data-testid="batch-picker-new-link">
        <Plus size={18} /> New batch
      </Link>
    </div>
  );
};
