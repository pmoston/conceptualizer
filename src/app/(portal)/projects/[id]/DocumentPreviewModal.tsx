"use client";
import { useEffect, useRef, useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";

interface Doc {
  id: string;
  name: string;
  mimeType: string;
  projectId: string;
  previewPath: string | null;
}

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];

export default function DocumentPreviewModal({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  const fileUrl = `/api/projects/${doc.projectId}/documents/${doc.id}/file`;
  const previewUrl = `/api/projects/${doc.projectId}/documents/${doc.id}/preview`;

  const isPdf = doc.mimeType === "application/pdf";
  const isTxt = doc.mimeType === "text/plain";
  const isImage = IMAGE_TYPES.includes(doc.mimeType);

  // If the converter produced a preview PNG, show that for everything except images
  // (images are shown directly via fileUrl).
  const hasServerPreview = !!doc.previewPath;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pngReady, setPngReady] = useState(false);
  const [txtContent, setTxtContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isImage || hasServerPreview) {
      setLoading(false);
      return;
    }
    if (isPdf) {
      renderPdfFallback();
    } else if (isTxt) {
      fetch(fileUrl)
        .then(r => r.text())
        .then(t => { setTxtContent(t); setLoading(false); })
        .catch(() => { setError("Could not load file."); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, []);

  async function renderPdfFallback() {
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();

      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);

      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      setPngReady(true);
      setLoading(false);
    } catch {
      setError("Could not render PDF preview.");
      setLoading(false);
    }
  }

  function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = doc.name.replace(/\.pdf$/i, "") + "_preview.png";
    a.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="font-semibold text-[#1c1e3b] truncate max-w-lg">{doc.name}</h2>
          <div className="flex items-center gap-3 shrink-0">
            {isPdf && pngReady && (
              <button onClick={downloadPng}
                className="text-xs text-gray-500 hover:text-[#1c1e3b] border border-gray-200 px-3 py-1.5 rounded-lg hover:border-gray-300 transition">
                Save as PNG
              </button>
            )}
            <a href={fileUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs bg-[#1c1e3b] text-white px-3 py-1.5 rounded-lg hover:bg-[#2a2d52] transition">
              Open
            </a>
            <button onClick={onClose} className="text-gray-400 hover:text-[#1c1e3b]">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <Loader2 size={24} className="animate-spin" />
              <p className="text-sm">Loading preview…</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <AlertCircle size={24} />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Server-generated PNG preview (DOCX, TXT, PDF with converter) */}
          {hasServerPreview && !isImage && (
            <img src={previewUrl} alt="Preview" className="max-w-full rounded border border-gray-100 shadow-sm" />
          )}

          {/* Direct image display */}
          {isImage && (
            <img src={fileUrl} alt={doc.name} className="max-w-full rounded border border-gray-100 shadow-sm" />
          )}

          {/* Fallback: PDF via pdfjs (no server preview) */}
          {isPdf && !hasServerPreview && (
            <canvas ref={canvasRef} className={`max-w-full rounded border border-gray-100 shadow-sm ${pngReady ? "" : "hidden"}`} />
          )}

          {/* Fallback: TXT (no server preview) */}
          {isTxt && !hasServerPreview && txtContent !== null && (
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed w-full">
              {txtContent}
            </pre>
          )}

          {/* Fallback: unsupported type, no preview */}
          {!isImage && !hasServerPreview && !isPdf && !isTxt && !loading && !error && (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <AlertCircle size={24} />
              <p className="text-sm">No browser preview available for this file type.</p>
              <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                className="text-sm text-[#1c1e3b] underline">Download to open</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
