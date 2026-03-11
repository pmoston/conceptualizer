"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { DocumentType } from "@prisma/client";
import { Upload, Check, Loader2 } from "lucide-react";
import SelectTooltip from "@/components/SelectTooltip";
import { documentTypeTooltip } from "@/lib/tooltipData";

const typeLabels: Record<DocumentType, string> = {
  SOURCE_MATERIAL: "Source Material",
  DRAFT: "Draft",
  FINAL: "Final",
  SUPPORTING: "Supporting",
};

type Phase = "idle" | "uploading" | "converting" | "done";

const steps: { phase: Phase; label: string }[] = [
  { phase: "uploading",  label: "Uploading file" },
  { phase: "converting", label: "Generating preview" },
  { phase: "done",       label: "Done" },
];

function StepIndicator({ current }: { current: Phase }) {
  const order: Phase[] = ["uploading", "converting", "done"];
  const currentIdx = order.indexOf(current);

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const stepIdx = order.indexOf(step.phase);
        const isActive = stepIdx === currentIdx;
        const isDone = stepIdx < currentIdx;

        return (
          <div key={step.phase} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                isDone   ? "bg-green-100 text-green-600" :
                isActive ? "bg-[#b3cc26]/20 text-[#1c1e3b]" :
                           "bg-gray-100 text-gray-400"
              }`}>
                {isDone   ? <Check size={12} strokeWidth={2.5} /> :
                 isActive ? <Loader2 size={12} className="animate-spin" /> :
                            <span className="text-xs font-medium">{i + 1}</span>}
              </div>
              <span className={`text-xs ${
                isDone   ? "text-green-600" :
                isActive ? "font-medium text-[#1c1e3b]" :
                           "text-gray-400"
              }`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-px mx-2 ${stepIdx < currentIdx ? "bg-green-200" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function UploadForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<DocumentType>(DocumentType.SOURCE_MATERIAL);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const busy = phase !== "idle";

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (busy) return;
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || busy) return;

    setPhase("uploading");
    setError(null);

    const form = new FormData();
    form.append("file", file);
    form.append("type", type);

    const xhr = new XMLHttpRequest();

    // Once all bytes have been sent, the server is now converting
    xhr.upload.addEventListener("load", () => setPhase("converting"));

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setPhase("done");
        router.push(`/projects/${projectId}`);
        router.refresh();
      } else {
        const msg = (() => { try { return JSON.parse(xhr.responseText).error; } catch { return "Upload failed"; } })();
        setError(msg);
        setPhase("idle");
      }
    });

    xhr.addEventListener("error", () => {
      setError("Network error — upload failed");
      setPhase("idle");
    });

    xhr.open("POST", `/api/projects/${projectId}/documents`);
    xhr.send(form);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
      {/* Drop zone — non-interactive while busy */}
      <div
        onDragOver={(e) => { if (!busy) { e.preventDefault(); setDragging(true); } }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => { if (!busy) inputRef.current?.click(); }}
        className={`border-2 border-dashed rounded-xl p-10 text-center transition ${
          busy     ? "border-gray-100 bg-gray-50 cursor-default opacity-60" :
          dragging ? "border-[#b3cc26] bg-[#b3cc26]/5 cursor-pointer" :
                     "border-gray-200 hover:border-[#b3cc26] cursor-pointer"
        }`}
      >
        <Upload size={24} className="mx-auto text-gray-300 mb-2" />
        {file ? (
          <p className="text-sm font-medium text-[#1c1e3b]">{file.name}</p>
        ) : (
          <>
            <p className="text-sm text-gray-500">Drag & drop or click to select</p>
            <p className="text-xs text-gray-400 mt-1">PDF, DOCX, XLSX, TXT, PNG, JPG or SVG</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.xlsx,.txt,.png,.jpg,.jpeg,.svg"
          className="hidden"
          disabled={busy}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <label className="block text-sm font-medium text-[#1c1e3b]">Document type</label>
          <SelectTooltip title="Document type" items={documentTypeTooltip} />
        </div>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as DocumentType)}
          disabled={busy}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b3cc26] disabled:opacity-50"
        >
          {Object.entries(typeLabels).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {busy ? (
        <div className="pt-1">
          <StepIndicator current={phase} />
        </div>
      ) : (
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={!file}
            className="bg-[#b3cc26] text-[#1c1e3b] font-semibold text-sm px-5 py-2 rounded-lg hover:brightness-105 disabled:opacity-50 transition"
          >
            Upload
          </button>
          <button type="button" onClick={() => router.back()} className="text-sm text-gray-500 hover:text-[#1c1e3b] px-4 py-2">
            Cancel
          </button>
        </div>
      )}
    </form>
  );
}
