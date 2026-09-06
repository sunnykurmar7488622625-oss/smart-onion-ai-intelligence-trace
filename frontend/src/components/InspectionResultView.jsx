import { ScanEye, Sparkles } from "lucide-react";
import { DetectionImage } from "@/components/DetectionImage";
import { GradeSummary } from "@/components/GradeSummary";
import { QualityBreakdown } from "@/components/QualityBreakdown";
import { StatusBadge } from "@/components/StatusBadge";
import { SOURCE_LABEL } from "@/lib/format";

const ENGINE_LABEL = (provider, model) => {
  if (provider === "local" || provider === "local-fallback") return "Local image processing (no AI key connected)";
  if (provider === "demo-seed") return "Demo record";
  return `${provider} · ${model}`;
};

export const InspectionResultView = ({ result, children }) => (
  <div className="space-y-6" data-testid="inspection-result">
    <div className="oa-card p-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="eyebrow">AI-Assisted Onion Quality Assessment</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <StatusBadge status={result.overall_status} testId="result-status-badge" />
          <StatusBadge status={result.source} />
          <span className="text-sm text-stone-500">
            {result.total_detected} onion{result.total_detected === 1 ? "" : "s"} · {result.images_analyzed} image{result.images_analyzed === 1 ? "" : "s"} ·{" "}
            {SOURCE_LABEL[result.source]}
          </span>
        </div>
      </div>
      {children}
    </div>

    <GradeSummary metrics={result} />

    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3">
        <QualityBreakdown percentages={result.percentages} counts={result.counts} />
      </div>
      <div className="lg:col-span-2 oa-card p-6 flex flex-col">
        <div className="flex items-center gap-2 text-brand">
          <Sparkles size={18} />
          <h3 className="font-display text-lg font-bold text-ink">What the AI saw</h3>
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-stone-700" data-testid="ai-summary">{result.ai_summary}</p>
        <p className="mt-auto pt-4 text-xs text-stone-500 border-t border-stone-100">
          Engine: {ENGINE_LABEL(result.ai_provider, result.ai_model)}. Results are estimates from visible characteristics and are not 100% accurate — please confirm with human verification.
        </p>
      </div>
    </div>

    {result.images?.length > 0 && (
      <div className="oa-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <ScanEye size={18} className="text-brand-accent" />
          <h3 className="font-display text-lg font-bold">Detection Overlay</h3>
        </div>
        <div className={`grid gap-4 ${result.images.length === 1 ? "grid-cols-1 max-w-2xl" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
          {result.images.map((img, i) => (
            <DetectionImage key={i} src={`data:image/jpeg;base64,${img.data}`} detections={img.detections} testId={`result-image-${i}`} />
          ))}
        </div>
      </div>
    )}
  </div>
);
