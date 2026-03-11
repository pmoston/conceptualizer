"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { DocumentType } from "@prisma/client";
import { Upload } from "lucide-react";

const typeLabels: Record<DocumentType, string> = {
  SOURCE_MATERIAL: "Source Material",
  DRAFT: "Draft",
  FINAL: "Final",
  SUPPORTING: "Supporting",
};

export default function UploadForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<DocumentType>(DocumentType.SOURCE_MATERIAL);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);

    const form = new FormData();
    form.append("file", file);
    form.append("type", type);

    try {
      const res = await fetch(`/api/projects/${projectId}/documents`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/projects/${projectId}`);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
          dragging ? "border-[#b3cc26] bg-[#b3cc26]/5" : "border-gray-200 hover:border-[#b3cc26]"
        }`}
      >
        <Upload size={24} className="mx-auto text-gray-300 mb-2" />
        {file ? (
          <p className="text-sm font-medium text-[#1c1e3b]">{file.name}</p>
        ) : (
          <>
            <p className="text-sm text-gray-500">Drag & drop or click to select</p>
            <p className="text-xs text-gray-400 mt-1">PDF, DOCX or TXT</p>
          </>
        )}
        <input ref={inputRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1c1e3b] mb-1">Document type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as DocumentType)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b3cc26]"
        >
          {Object.entries(typeLabels).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={!file || uploading}
          className="bg-[#b3cc26] text-[#1c1e3b] font-semibold text-sm px-5 py-2 rounded-lg hover:brightness-105 disabled:opacity-50 transition"
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <button type="button" onClick={() => router.back()} className="text-sm text-gray-500 hover:text-[#1c1e3b] px-4 py-2">
          Cancel
        </button>
      </div>
    </form>
  );
}
