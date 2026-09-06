import { Loader2, Save } from "lucide-react";
import { BatchPicker } from "@/components/BatchPicker";

export const SaveToBatchPanel = ({ flow }) => (
  <div className="oa-card p-6 border-brand/20 bg-brand-soft/40" data-testid="save-to-batch-panel">
    <h3 className="font-display text-lg font-bold">Save to Batch</h3>
    <p className="text-sm text-stone-600 mb-4">Saving records this check as the next storage day for the batch and refreshes its quality report.</p>
    <div className="space-y-3">
      <BatchPicker value={flow.batchId} onChange={flow.setBatchId} />
      <input className="field" placeholder="Notes for this check (optional)" value={flow.notes} onChange={(e) => flow.setNotes(e.target.value)} data-testid="inspection-notes-input" />
      <button onClick={flow.save} disabled={flow.saving || !flow.batchId} className="btn-primary w-full text-base" data-testid="save-inspection-button">
        {flow.saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save Inspection to Batch
      </button>
    </div>
  </div>
);
