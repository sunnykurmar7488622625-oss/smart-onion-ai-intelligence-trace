import dayjs from "dayjs";

export const fmtDate = (value) => (value ? dayjs(value).format("DD MMM YYYY") : "—");
export const fmtDateTime = (value) => (value ? dayjs(value).format("DD MMM YYYY, HH:mm") : "—");
export const fmtQty = (qty, unit) => `${Number(qty).toLocaleString("en-IN")} ${unit}`;
export const pct = (value) => (value == null ? "—" : `${Number(value).toFixed(value % 1 === 0 ? 0 : 1)}%`);

export const SOURCE_LABEL = { CAMERA: "Camera Scan", IMAGE_UPLOAD: "Image Upload" };

export const BATCH_STATUS_LABEL = {
  CREATED: "Awaiting Inspection",
  INSPECTED: "Inspected",
  DISPATCH_APPROVED: "Approved for Dispatch",
  REINSPECTION_REQUIRED: "Reinspection Required",
  DISPATCHED: "Dispatched",
};

export const QUALITY_LABELS = [
  { key: "good", label: "Good", color: "#059669" },
  { key: "damaged", label: "Damaged", color: "#EF4444" },
  { key: "rotten", label: "Rotten", color: "#7F1D1D" },
  { key: "sprouted", label: "Sprouted", color: "#0891B2" },
  { key: "undersized", label: "Undersized", color: "#F59E0B" },
  { key: "oversized", label: "Oversized", color: "#F97316" },
];
