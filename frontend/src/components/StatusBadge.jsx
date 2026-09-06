import { BATCH_STATUS_LABEL } from "@/lib/format";

const STYLES = {
  PASS: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "REVIEW REQUIRED": "bg-amber-100 text-amber-800 border-amber-200",
  "LOW QUALITY": "bg-red-100 text-red-800 border-red-200",
  CREATED: "bg-stone-100 text-stone-700 border-stone-200",
  INSPECTED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  DISPATCH_APPROVED: "bg-sky-100 text-sky-800 border-sky-200",
  REINSPECTION_REQUIRED: "bg-amber-100 text-amber-800 border-amber-200",
  DISPATCHED: "bg-stone-900 text-white border-stone-900",
  VERIFIED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  PENDING: "bg-stone-100 text-stone-700 border-stone-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  declining: "bg-red-100 text-red-800 border-red-200",
  stable: "bg-emerald-100 text-emerald-800 border-emerald-200",
  improving: "bg-sky-100 text-sky-800 border-sky-200",
  CAMERA: "bg-brand-soft text-brand border-brand/20",
  IMAGE_UPLOAD: "bg-brand-soft text-brand border-brand/20",
};

const LABELS = {
  ...BATCH_STATUS_LABEL,
  VERIFIED: "Human Verified",
  PENDING: "Verification Pending",
  REJECTED: "Rejected by Inspector",
  APPROVED: "Approved",
  declining: "Declining",
  stable: "Stable",
  improving: "Improving",
  CAMERA: "Camera",
  IMAGE_UPLOAD: "Upload",
};

export const StatusBadge = ({ status, className = "", testId }) => {
  if (!status) return null;
  return (
    <span
      data-testid={testId}
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${STYLES[status] || STYLES.PENDING} ${className}`}
    >
      {LABELS[status] || status}
    </span>
  );
};
