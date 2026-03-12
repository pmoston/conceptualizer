"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Loader2 } from "lucide-react";
import { Language, Platform } from "@prisma/client";
import SelectTooltip from "@/components/SelectTooltip";
import { languageTooltip, platformTooltip } from "@/lib/tooltipData";

interface Deal { id: string; name: string; }

interface Props {
  project: {
    id: string;
    title: string;
    language: Language;
    platform: Platform | null;
    description: string | null;
    dealId: string | null;
  };
  deals: Deal[];
}

export default function EditProjectDialog({ project, deals }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: project.title,
    language: project.language,
    platform: project.platform ?? ("" as Platform | ""),
    description: project.description ?? "",
    dealId: project.dealId ?? "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          language: form.language,
          platform: form.platform || null,
          description: form.description || null,
          dealId: form.dealId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data.error));
      setOpen(false);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#1c1e3b] border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition"
      >
        <Pencil size={14} /> Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-[#1c1e3b]">Edit Project</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-[#1c1e3b]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Title *</label>
                <input
                  required
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b3cc26]"
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <label className="block text-xs font-medium text-gray-500">Language</label>
                  <SelectTooltip title="Project language" items={languageTooltip} />
                </div>
                <select
                  value={form.language}
                  onChange={e => setForm(f => ({ ...f, language: e.target.value as Language }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b3cc26]"
                >
                  <option value={Language.DE}>German</option>
                  <option value={Language.EN}>English</option>
                </select>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <label className="block text-xs font-medium text-gray-500">Platform <span className="text-gray-400 font-normal">(optional)</span></label>
                  <SelectTooltip title="Target platform" items={platformTooltip} />
                </div>
                <select
                  value={form.platform}
                  onChange={e => setForm(f => ({ ...f, platform: e.target.value as Platform | "" }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b3cc26]"
                >
                  <option value="">Not specified</option>
                  <option value={Platform.MICROSOFT_FABRIC}>Microsoft Fabric</option>
                  <option value={Platform.MICROSOFT_AZURE}>Microsoft Azure</option>
                  <option value={Platform.DATABRICKS}>Databricks</option>
                  <option value={Platform.DENODO}>Denodo</option>
                  <option value={Platform.OTHER}>Other</option>
                </select>
              </div>

              {deals.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Deal <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <select
                    value={form.dealId}
                    onChange={e => setForm(f => ({ ...f, dealId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b3cc26]"
                  >
                    <option value="">No deal</option>
                    {deals.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Description <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b3cc26]"
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-[#1c1e3b] px-4 py-2">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-[#b3cc26] text-[#1c1e3b] font-semibold text-sm px-5 py-2 rounded-lg hover:brightness-105 disabled:opacity-50 transition"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
