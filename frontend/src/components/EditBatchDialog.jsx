import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { api, errMsg } from "@/lib/api";

const FIELDS = [
  ["variety", "Onion variety", "text"],
  ["supplier_name", "Supplier / Farmer", "text"],
  ["procurement_center", "Procurement center", "text"],
  ["storage_location", "Storage location", "text"],
];

export const EditBatchDialog = ({ batch, onSaved }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({});

  const openWith = () => {
    setForm({
      variety: batch.variety,
      quantity: batch.quantity,
      unit: batch.unit,
      supplier_name: batch.supplier_name,
      procurement_center: batch.procurement_center,
      storage_location: batch.storage_location || "",
      notes: batch.notes || "",
    });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put(`/batches/${batch.batch_id}`, { ...form, quantity: Number(form.quantity) });
      toast.success("Batch details updated");
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(errMsg(err, "Could not update batch"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button onClick={openWith} className="btn-secondary" data-testid="edit-batch-button"><Pencil size={18} /> Edit details</button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-2xl" data-testid="edit-batch-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Edit {batch.batch_id}</DialogTitle>
          <DialogDescription>Correct batch details. Inspection results and history stay unchanged.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div className="grid grid-cols-[1fr_110px] gap-3">
            <div>
              <label className="label" htmlFor="edit-quantity">Quantity</label>
              <input id="edit-quantity" type="number" min="0.1" step="0.1" required className="field" value={form.quantity ?? ""} onChange={(e) => setForm({ ...form, quantity: e.target.value })} data-testid="edit-quantity-input" />
            </div>
            <div>
              <label className="label" htmlFor="edit-unit">Unit</label>
              <select id="edit-unit" className="field" value={form.unit || "kg"} onChange={(e) => setForm({ ...form, unit: e.target.value })} data-testid="edit-unit-select">
                <option value="kg">kg</option>
                <option value="tonnes">tonnes</option>
              </select>
            </div>
          </div>
          {FIELDS.map(([key, label]) => (
            <div key={key}>
              <label className="label" htmlFor={`edit-${key}`}>{label}</label>
              <input id={`edit-${key}`} className="field" required={key !== "storage_location"} value={form[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} data-testid={`edit-${key}-input`} />
            </div>
          ))}
          <div>
            <label className="label" htmlFor="edit-notes">Notes</label>
            <textarea id="edit-notes" rows={3} className="field" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="edit-notes-input" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" className="btn-primary flex-1" disabled={busy} data-testid="edit-batch-save-button">{busy && <Loader2 size={18} className="animate-spin" />} Save changes</button>
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)} data-testid="edit-batch-cancel-button">Cancel</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
