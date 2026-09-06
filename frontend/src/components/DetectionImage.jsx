const BOX_COLORS = {
  good: "border-emerald-400",
  undersized: "border-amber-400",
  oversized: "border-orange-400",
  damaged: "border-red-500",
  rotten: "border-red-700",
  sprouted: "border-cyan-400",
};

export const DetectionImage = ({ src, detections = [], className = "", scanning = false, testId }) => (
  <div className={`relative overflow-hidden rounded-2xl bg-stone-900 ${className}`} data-testid={testId}>
    <img src={src} alt="Onion inspection" className="block w-full h-auto" />
    {detections.map((d, i) => (
      <div
        key={i}
        className={`absolute border-2 rounded-sm ${BOX_COLORS[d.label] || "border-white"} ${scanning ? "animate-pulse-ring" : ""}`}
        style={{ left: `${d.box[0] * 100}%`, top: `${d.box[1] * 100}%`, width: `${d.box[2] * 100}%`, height: `${d.box[3] * 100}%` }}
      >
        <span className="absolute -top-5 left-0 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white whitespace-nowrap">
          {d.label}
        </span>
      </div>
    ))}
    {detections.length > 0 && (
      <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2.5 py-1 text-xs font-bold text-white">{detections.length} detected</span>
    )}
  </div>
);
