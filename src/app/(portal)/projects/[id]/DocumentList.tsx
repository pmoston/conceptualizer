"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ExternalLink, Eye, X, Loader2, AlertTriangle, RefreshCw, FileText, Download } from "lucide-react";
import { DocumentType } from "@prisma/client";
import DocumentPreviewModal from "./DocumentPreviewModal";
import SelectTooltip from "@/components/SelectTooltip";
import { documentTypeTooltip } from "@/lib/tooltipData";

interface Doc {
  id: string;
  name: string;
  type: DocumentType;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date | string;
  projectId: string;
  previewPath: string | null;
  previewError: string | null;
  ocrText: string | null;
}

const typeLabels: Record<DocumentType, string> = {
  SOURCE_MATERIAL: "Source Material",
  DRAFT: "Draft",
  FINAL: "Final",
  SUPPORTING: "Supporting",
};

const typeColors: Record<DocumentType, string> = {
  SOURCE_MATERIAL: "bg-gray-100 text-gray-500",
  DRAFT: "bg-blue-50 text-blue-600",
  FINAL: "bg-green-50 text-green-600",
  SUPPORTING: "bg-yellow-50 text-yellow-600",
};

export default function DocumentList({ documents, projectId }: { documents: Doc[]; projectId: string }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<DocumentType>(DocumentType.SOURCE_MATERIAL);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<Doc | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [regenErrors, setRegenErrors] = useState<Record<string, string>>({});
  const [regenDone, setRegenDone] = useState<Record<string, boolean>>({});
  const [ocrExpandedId, setOcrExpandedId] = useState<string | null>(null);
  const [ocrEditText, setOcrEditText] = useState("");
  const [ocrSaving, setOcrSaving] = useState(false);
  const [ocrSaveError, setOcrSaveError] = useState<string | null>(null);

  function startEdit(doc: Doc) {
    setEditingId(doc.id);
    setEditName(doc.name);
    setEditType(doc.type);
    setEditError(null);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, type: editType }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setEditingId(null);
      router.refresh();
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : "Failed");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(docId: string) {
    setDeletingId(docId);
    await fetch(`/api/projects/${projectId}/documents/${docId}`, { method: "DELETE" });
    setDeletingId(null);
    setConfirmDeleteId(null);
    router.refresh();
  }

  async function handleRegenerate(docId: string) {
    setRegeneratingId(docId);
    setRegenDone(prev => { const n = { ...prev }; delete n[docId]; return n; });
    setRegenErrors(prev => { const n = { ...prev }; delete n[docId]; return n; });
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/preview`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.previewError) throw new Error(data.previewError);
      setRegenDone(prev => ({ ...prev, [docId]: true }));
      router.refresh();
    } catch (e: unknown) {
      setRegenErrors(prev => ({ ...prev, [docId]: e instanceof Error ? e.message : "Regeneration failed" }));
    } finally {
      setRegeneratingId(null);
    }
  }

  function toggleOcr(doc: Doc) {
    if (ocrExpandedId === doc.id) {
      setOcrExpandedId(null);
    } else {
      setOcrExpandedId(doc.id);
      setOcrEditText(doc.ocrText ?? "");
      setOcrSaveError(null);
    }
  }

  async function saveOcr(docId: string) {
    setOcrSaving(true);
    setOcrSaveError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ocrText: ocrEditText || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setOcrExpandedId(null);
      router.refresh();
    } catch (e: unknown) {
      setOcrSaveError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setOcrSaving(false);
    }
  }

  if (documents.length === 0) {
    return <p className="text-sm text-gray-400">No documents yet. Upload source materials to get started.</p>;
  }

  return (
    <>
      <div className="divide-y divide-gray-50">
        {documents.map(doc => (
          <div key={doc.id}>
            {editingId === doc.id ? (
              <form onSubmit={handleEdit} className="py-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    required
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#b3cc26]"
                  />
                  <div className="flex items-center gap-1">
                    <select
                      value={editType}
                      onChange={e => setEditType(e.target.value as DocumentType)}
                      className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#b3cc26]"
                    >
                      {Object.entries(typeLabels).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                    <SelectTooltip title="Document type" items={documentTypeTooltip} />
                  </div>
                </div>
                {editError && <p className="text-xs text-red-500">{editError}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={editSaving}
                    className="flex items-center gap-1.5 bg-[#b3cc26] text-[#1c1e3b] font-semibold text-xs px-3 py-1.5 rounded-lg hover:brightness-105 disabled:opacity-50 transition">
                    {editSaving && <Loader2 size={11} className="animate-spin" />}
                    {editSaving ? "Saving…" : "Save"}
                  </button>
                  <button type="button" onClick={() => setEditingId(null)}
                    className="text-xs text-gray-500 hover:text-[#1c1e3b] px-3 py-1.5 flex items-center gap-1">
                    <X size={11} /> Cancel
                  </button>
                </div>
              </form>
            ) : confirmDeleteId === doc.id ? (
              <div className="py-3 flex items-center justify-between">
                <p className="text-sm text-gray-600">Delete <span className="font-medium">{doc.name}</span>?</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setConfirmDeleteId(null)} className="text-sm text-gray-500 hover:text-[#1c1e3b] px-3 py-1">Cancel</button>
                  <button onClick={() => handleDelete(doc.id)} disabled={deletingId === doc.id}
                    className="flex items-center gap-1.5 bg-red-500 text-white text-sm px-3 py-1 rounded-lg hover:bg-red-600 disabled:opacity-50 transition">
                    {deletingId === doc.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    {deletingId === doc.id ? "Deleting…" : "Confirm"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="py-3 flex items-center justify-between group">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-[#1c1e3b] truncate">{doc.name}</p>
                      {!doc.previewPath && (
                        <span
                          title={
                            regenErrors[doc.id]
                              ? `Preview error: ${regenErrors[doc.id]}`
                              : doc.previewError
                                ? `Preview unavailable: ${doc.previewError}`
                                : "Preview not yet generated"
                          }
                          className="shrink-0"
                        >
                          <AlertTriangle size={13} className={regenErrors[doc.id] || doc.previewError ? "text-orange-400" : "text-gray-300"} />
                        </span>
                      )}
                    </div>
                    {regeneratingId === doc.id && (
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <Loader2 size={10} className="animate-spin" /> Generating preview…
                      </p>
                    )}
                    {regenDone[doc.id] && regeneratingId !== doc.id && (
                      <p className="text-xs text-green-500 mt-0.5">Preview ready</p>
                    )}
                    {(regenErrors[doc.id] || (!doc.previewPath && doc.previewError)) && (
                      <p className="text-xs text-orange-500 mt-0.5">
                        {regenErrors[doc.id] ?? "Preview generation failed — converter may be unavailable."}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${typeColors[doc.type]}`}>
                        {typeLabels[doc.type]}
                      </span>
                      <span className="text-xs text-gray-400">{(doc.sizeBytes / 1024).toFixed(0)} KB</span>
                      <span className="text-xs text-gray-400">{new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-3 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => setPreviewDoc(doc)} title="Preview"
                      className="p-1.5 text-gray-400 hover:text-[#1c1e3b] transition">
                      <Eye size={15} />
                    </button>
                    <a href={`/api/projects/${projectId}/documents/${doc.id}/file`} target="_blank" rel="noopener noreferrer"
                      title="Open" className="p-1.5 text-gray-400 hover:text-[#1c1e3b] transition">
                      <ExternalLink size={15} />
                    </a>
                    {(doc.ocrText !== null || doc.mimeType.startsWith("image/")) && (
                      <button
                        onClick={() => toggleOcr(doc)}
                        title={ocrExpandedId === doc.id ? "Close OCR text" : "View / edit OCR text"}
                        className={`p-1.5 transition ${ocrExpandedId === doc.id ? "text-[#b3cc26]" : "text-gray-400 hover:text-[#1c1e3b]"}`}>
                        <FileText size={15} />
                      </button>
                    )}
                    {!doc.previewPath && (
                      <button
                        onClick={() => handleRegenerate(doc.id)}
                        disabled={regeneratingId === doc.id}
                        title="Generate preview"
                        className="p-1.5 text-gray-400 hover:text-[#b3cc26] disabled:opacity-50 transition">
                        {regeneratingId === doc.id
                          ? <Loader2 size={15} className="animate-spin" />
                          : <RefreshCw size={15} />}
                      </button>
                    )}
                    <button onClick={() => startEdit(doc)} title="Edit"
                      className="p-1.5 text-gray-400 hover:text-[#1c1e3b] transition">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => setConfirmDeleteId(doc.id)} title="Delete"
                      className="p-1.5 text-gray-400 hover:text-red-400 transition">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Inline OCR text editor */}
                {ocrExpandedId === doc.id && (
                  <div className="pb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-gray-500">OCR text</p>
                      {doc.ocrText && (
                        <a
                          href={`/api/projects/${projectId}/documents/${doc.id}/ocr`}
                          download
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#1c1e3b] transition"
                        >
                          <Download size={12} /> Download .txt
                        </a>
                      )}
                    </div>
                    <textarea
                      value={ocrEditText}
                      onChange={e => setOcrEditText(e.target.value)}
                      rows={6}
                      placeholder="No OCR text yet — you can enter it manually or regenerate the preview."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#b3cc26] resize-y"
                    />
                    {ocrSaveError && <p className="text-xs text-red-500">{ocrSaveError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveOcr(doc.id)}
                        disabled={ocrSaving}
                        className="flex items-center gap-1.5 bg-[#b3cc26] text-[#1c1e3b] font-semibold text-xs px-3 py-1.5 rounded-lg hover:brightness-105 disabled:opacity-50 transition"
                      >
                        {ocrSaving && <Loader2 size={11} className="animate-spin" />}
                        {ocrSaving ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={() => setOcrExpandedId(null)}
                        className="text-xs text-gray-500 hover:text-[#1c1e3b] px-3 py-1.5 flex items-center gap-1"
                      >
                        <X size={11} /> Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {previewDoc && (
        <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}
    </>
  );
}
