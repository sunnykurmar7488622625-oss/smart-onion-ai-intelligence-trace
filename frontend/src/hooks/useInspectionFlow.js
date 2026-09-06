import { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";

export const useInspectionFlow = (source) => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [images, setImages] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [batchId, setBatchId] = useState(params.get("batch") || "");
  const [notes, setNotes] = useState("");

  const addImages = useCallback((urls) => setImages((prev) => [...prev, ...urls].slice(0, 6)), []);
  const removeImage = useCallback((index) => setImages((prev) => prev.filter((_, i) => i !== index)), []);

  const analyze = useCallback(async () => {
    if (!images.length) return;
    setAnalyzing(true);
    try {
      const { data } = await api.post("/inspections/analyze", { images, source });
      setAnalysis(data);
      toast.success(`Checked ${data.total_detected} onion${data.total_detected === 1 ? "" : "s"} · ${data.overall_status}`);
    } catch (e) {
      toast.error(errMsg(e, "Could not analyse the images"));
    } finally {
      setAnalyzing(false);
    }
  }, [images, source]);

  const save = useCallback(async () => {
    if (!analysis || !batchId) return toast.error("Choose a batch to save this inspection");
    setSaving(true);
    try {
      const { data } = await api.post("/inspections", { analysis_id: analysis.analysis_id, batch_id: batchId, notes });
      toast.success(`Inspection saved to ${data.batch_id} as Day ${data.inspection_day}`);
      navigate(`/inspections/${data.id}`);
    } catch (e) {
      toast.error(errMsg(e, "Could not save the inspection"));
    } finally {
      setSaving(false);
    }
  }, [analysis, batchId, notes, navigate]);

  const reset = useCallback(() => {
    setImages([]);
    setAnalysis(null);
  }, []);

  return { images, addImages, removeImage, analysis, analyzing, analyze, saving, save, reset, batchId, setBatchId, notes, setNotes };
};
