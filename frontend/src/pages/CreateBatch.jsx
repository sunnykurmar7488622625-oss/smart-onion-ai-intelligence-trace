import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg } from "@/lib/api";
import { PageHeader } from "@/components/States";

const VARIETIES = ["Nashik Red", "Bellary Red", "Pusa Red", "Agrifound Dark Red", "Pusa White Flat", "Bhima Super", "Arka Kalyan", "Other"];

export default function CreateBatch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    variety: "Nashik Red",
    quantity: "",
    unit: "kg",
    supplier_name: user.organization || user.name,
    procurement_center: "",
    storage_location: "",
    inspection_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/batches", { ...form, quantity: Number(form.quantity) });
      toast.success(`Batch ${data.batch_id} created`);
      navigate(`/batches/${data.batch_id}`);
    } catch (err) {
      toast.error(errMsg(err, "Could not create batch"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Batch Management" title="Create Onion Batch" description="A unique Batch ID is generated automatically. You can scan or upload images right after saving." />
      <form onSubmit={submit} className="oa-card p-6 md:p-8 space-y-6" data-testid="create-batch-form">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="label" htmlFor="variety">Onion variety</label>
            <select id="variety" className="field" value={form.variety} onChange={set("variety")} data-testid="batch-variety-select">
              {VARIETIES.map((v) => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <div>
              <label className="label" htmlFor="quantity">Quantity</label>
              <input id="quantity" type="number" min="0.1" step="0.1" required className="field" placeholder="5000" value={form.quantity} onChange={set("quantity")} data-testid="batch-quantity-input" />
            </div>
            <div>
              <label className="label" htmlFor="unit">Unit</label>
              <select id="unit" className="field" value={form.unit} onChange={set("unit")} data-testid="batch-unit-select">
                <option value="kg">kg</option>
                <option value="tonnes">tonnes</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="supplier">Supplier / Farmer</label>
            <input id="supplier" required className="field" value={form.supplier_name} onChange={set("supplier_name")} data-testid="batch-supplier-input" />
          </div>
          <div>
            <label className="label" htmlFor="center">Procurement center</label>
            <input id="center" required className="field" placeholder="Lasalgaon APMC" value={form.procurement_center} onChange={set("procurement_center")} data-testid="batch-center-input" />
          </div>
          <div>
            <label className="label" htmlFor="storage">Storage location</label>
            <input id="storage" className="field" placeholder="Cold storage B-4" value={form.storage_location} onChange={set("storage_location")} data-testid="batch-storage-input" />
          </div>
          <div>
            <label className="label" htmlFor="date">Inspection date</label>
            <input id="date" type="date" className="field" value={form.inspection_date} onChange={set("inspection_date")} data-testid="batch-date-input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="notes">Notes <span className="text-stone-400 font-normal">(optional)</span></label>
          <textarea id="notes" rows={3} className="field" placeholder="Harvest date, crate type, anything useful for buyers" value={form.notes} onChange={set("notes")} data-testid="batch-notes-input" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button type="submit" className="btn-primary text-base" disabled={busy} data-testid="batch-submit-button">
            {busy && <Loader2 size={18} className="animate-spin" />} Save Batch
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)} data-testid="batch-cancel-button">Cancel</button>
        </div>
      </form>
    </div>
  );
}
