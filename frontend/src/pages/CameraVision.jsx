import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Camera, CameraOff, Circle, ImagePlus, Loader2, RotateCcw, Sparkles, SwitchCamera, X } from "lucide-react";
import { useInspectionFlow } from "@/hooks/useInspectionFlow";
import { captureFrame } from "@/lib/image";
import { InspectionResultView } from "@/components/InspectionResultView";
import { SaveToBatchPanel } from "@/components/SaveToBatchPanel";
import { PageHeader } from "@/components/States";

export default function CameraVision() {
  const flow = useInspectionFlow("CAMERA");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [live, setLive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [camError, setCamError] = useState("");
  const [facing, setFacing] = useState("environment");

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLive(false);
  }, []);

  const start = useCallback(async (mode = facing) => {
    setCamError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError("Camera is not available in this browser. Use a modern mobile browser over HTTPS, or upload photos instead.");
      return;
    }
    setStarting(true);
    stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: mode }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setLive(true);
    } catch (e) {
      setCamError(e.name === "NotAllowedError" ? "Camera permission was denied. Allow camera access in your browser settings and try again." : `Could not open the camera (${e.message}).`);
    } finally {
      setStarting(false);
    }
  }, [facing, stop]);

  useEffect(() => stop, [stop]);
  useEffect(() => { if (flow.analysis) stop(); }, [flow.analysis, stop]);

  const capture = () => {
    if (!videoRef.current || flow.images.length >= 6) return toast.error("Maximum 6 scans per analysis — analyse and save, then keep scanning.");
    flow.addImages([captureFrame(videoRef.current)]);
  };
  const flip = () => { const next = facing === "environment" ? "user" : "environment"; setFacing(next); start(next); };

  if (flow.analysis) {
    return (
      <div>
        <PageHeader eyebrow="Camera Vision · AI Inspection" title="Scan Result" description="Review the AI-assisted assessment, then save it to a batch. Repeat scans for large lots — each save becomes the next storage day.">
          <button onClick={() => { flow.reset(); start(); }} className="btn-secondary" data-testid="scan-again-button"><RotateCcw size={18} /> Scan again</button>
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
      <PageHeader eyebrow="Camera Vision" title="Check Onion Quality with Camera" description="Point the camera at your onions, capture a frame and let the AI check size and visible defects. Capture several frames for a bigger sample.">
        <Link to="/inspect" className="btn-secondary" data-testid="switch-to-upload-link"><ImagePlus size={18} /> Upload photos instead</Link>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="relative w-full overflow-hidden rounded-3xl bg-stone-950 aspect-[4/3] sm:aspect-video" data-testid="camera-preview">
            <video ref={videoRef} playsInline muted className={`h-full w-full object-cover ${live ? "" : "hidden"}`} />
            {live && (
              <>
                <div className="scan-corner tl" /><div className="scan-corner tr" /><div className="scan-corner bl" /><div className="scan-corner br" />
                <div className="absolute inset-6 rounded-2xl border border-emerald-400/30 pointer-events-none" />
                <span className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-bold text-white"><span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> LIVE · Scan {flow.images.length + 1}</span>
                <span className="absolute right-4 top-4 rounded-full bg-black/60 px-3 py-1.5 text-xs font-bold text-white" data-testid="scan-count">{flow.images.length} captured</span>
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-4 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 p-3">
                  <button onClick={flip} className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors" aria-label="Switch camera" data-testid="switch-camera-button"><SwitchCamera size={20} /></button>
                  <button onClick={capture} className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-brand ring-4 ring-white/30 active:scale-95 transition-transform" aria-label="Capture" data-testid="capture-button"><Circle size={30} fill="currentColor" /></button>
                  <button onClick={stop} className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors" aria-label="Stop camera" data-testid="stop-camera-button"><CameraOff size={20} /></button>
                </div>
              </>
            )}
            {!live && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-white">
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10"><Camera size={36} /></span>
                <p className="font-display mt-5 text-2xl font-bold">{camError ? "Camera unavailable" : "Ready to scan"}</p>
                <p className="mt-2 max-w-md text-sm text-white/70" data-testid="camera-status-text">{camError || "We will ask for camera permission. Your camera feed stays on this device — only captured frames are analysed."}</p>
                <button onClick={() => start()} disabled={starting} className="btn-accent mt-6 text-base" data-testid="start-scan-button">
                  {starting ? <Loader2 size={18} className="animate-spin" /> : <Camera size={20} />} {camError ? "Try again" : "Start Scan"}
                </button>
              </div>
            )}
          </div>

          {flow.images.length > 0 && (
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-2" data-testid="captured-frames">
              {flow.images.map((src, i) => (
                <div key={i} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-stone-900">
                  <img src={src} alt={`Scan ${i + 1}`} className="h-full w-full object-cover" />
                  <button onClick={() => flow.removeImage(i)} className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white" aria-label="Retake" data-testid={`retake-${i}`}><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="oa-card p-6 flex flex-col gap-4 h-fit">
          <p className="eyebrow">Scan count</p>
          <p className="font-display text-4xl font-bold" data-testid="capture-count">{flow.images.length}<span className="text-lg text-stone-400 font-semibold"> / 6 frames</span></p>
          <button onClick={flow.analyze} disabled={!flow.images.length || flow.analyzing} className="btn-primary w-full text-base" data-testid="analyze-button">
            {flow.analyzing ? <><Loader2 size={18} className="animate-spin" /> AI is checking…</> : <><Sparkles size={18} /> Analyze Scans</>}
          </button>
          {flow.images.length > 0 && !flow.analyzing && (
            <button onClick={() => flow.removeImage(flow.images.length - 1)} className="btn-secondary w-full" data-testid="retake-last-button"><RotateCcw size={18} /> Retake last frame</button>
          )}
          <ol className="text-sm text-stone-500 space-y-1.5 border-t border-stone-100 pt-4">
            <li>1. Start Scan and allow camera</li>
            <li>2. Capture 1–6 frames of the lot</li>
            <li>3. Analyze → review Grade A / URS</li>
            <li>4. Save to batch → report is ready</li>
          </ol>
          <div className="rounded-xl bg-subtle p-3 text-xs text-stone-600 space-y-1" data-testid="camera-accuracy-tips">
            <p className="font-bold uppercase tracking-wider text-stone-500">For accurate results</p>
            <p>· Spread onions in a single layer, not a heap</p>
            <p>· Hold steady 30–50 cm above, fill the frame</p>
            <p>· Daylight or bright even light, no harsh shadows</p>
            <p>· Include 10–30 onions per frame; scan more frames for big lots</p>
          </div>
          <p className="text-xs text-stone-400">Capture → analyse workflow. The AI runs on the server after each capture; nothing is faked in real time.</p>
        </div>
      </div>
    </div>
  );
}
