import { useRef } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Camera, ImagePlus, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import { useInspectionFlow } from "@/hooks/useInspectionFlow";
import { fileToDataUrl } from "@/lib/image";
import { InspectionResultView } from "@/components/InspectionResultView";
import { SaveToBatchPanel } from "@/components/SaveToBatchPanel";
import { PageHeader } from "@/components/States";

export default function UploadInspect() {
  const flow = useInspectionFlow("IMAGE_UPLOAD");
  const inputRef = useRef(null);

  const onFiles = async (files) => {
    const list = Array.from(files || []).slice(0, 6 - flow.images.length);
    if (!list.length) return toast.error("You can analyse up to 6 images at once");
    try {
      flow.addImages(await Promise.all(list.map(fileToDataUrl)));
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (flow.analysis) {
    return (
      <div>
        <PageHeader eyebrow="AI Inspection · Image Upload" title="Inspection Result" description="Review the AI-assisted assessment, then save it to a batch to create the digital report.">
          <button onClick={flow.reset} className="btn-secondary" data-testid="analyze-again-button"><RotateCcw size={18} /> Check other images</button>
        </PageHeader>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2"><InspectionResultView result={flow.analysis} /></div>
          <div className="xl:col-span-1"><SaveToBatchPanel flow={flow} /></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="AI Inspection" title="Check Onion Quality from Photos" description="Upload one or more clear photos of your onions. We detect each onion, check size and visible defects, and estimate Grade A and URS.">
        <Link to="/camera" className="btn-secondary" data-testid="switch-to-camera-link"><Camera size={18} /> Scan with Camera instead</Link>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files); }}
            className="w-full oa-card border-dashed border-2 p-10 md:p-14 flex flex-col items-center text-center hover:border-brand hover:bg-brand-soft/30 transition-colors"
            data-testid="upload-dropzone"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-brand"><ImagePlus size={30} /></span>
            <p className="font-display mt-5 text-xl font-bold">Tap to choose photos</p>
            <p className="mt-1 text-sm text-stone-500">JPEG, PNG or WEBP · up to 6 images · 8MB each</p>
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} data-testid="upload-file-input" />
          </button>

          {flow.images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" data-testid="upload-previews">
              {flow.images.map((src, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden bg-stone-900 aspect-[4/3]">
                  <img src={src} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" />
                  <button onClick={() => flow.removeImage(i)} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black" aria-label="Remove image" data-testid={`remove-image-${i}`}><X size={16} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="oa-card p-6 flex flex-col gap-4 h-fit">
          <p className="eyebrow">Ready to analyse</p>
          <p className="font-display text-4xl font-bold" data-testid="upload-count">{flow.images.length}<span className="text-lg text-stone-400 font-semibold"> / 6 images</span></p>
          <button onClick={flow.analyze} disabled={!flow.images.length || flow.analyzing} className="btn-primary w-full text-base" data-testid="analyze-button">
            {flow.analyzing ? <><Loader2 size={18} className="animate-spin" /> Checking quality…</> : <><Sparkles size={18} /> Check Onion Quality</>}
          </button>
          <ul className="text-sm text-stone-500 space-y-1.5 border-t border-stone-100 pt-4">
            <li>· Spread onions on a plain surface</li>
            <li>· Use daylight or bright, even light</li>
            <li>· Keep the camera 30–60 cm away</li>
          </ul>
          <p className="text-xs text-stone-400">AI-Assisted Onion Quality Assessment — results are estimates and need human confirmation.</p>
        </div>
      </div>
    </div>
  );
}
