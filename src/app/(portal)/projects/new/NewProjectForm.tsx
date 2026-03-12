"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Language, Platform } from "@prisma/client";
import SelectTooltip from "@/components/SelectTooltip";
import { languageTooltip, platformTooltip } from "@/lib/tooltipData";

interface Deal { id: string; name: string; }
interface Customer { id: string; name: string; deals: Deal[]; }

export default function NewProjectForm({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [dealId, setDealId] = useState("");
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState<Language>(Language.DE);
  const [platform, setPlatform] = useState<Platform | "">("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, language, platform: platform || null, customerId, dealId: dealId || null, description: description || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data.error));
      router.push(`/projects/${data.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create project");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#1c1e3b] mb-1">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b3cc26]"
          placeholder="e.g. Data Strategy Concept"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1c1e3b] mb-1">Customer</label>
        <select
          value={customerId}
          onChange={(e) => { setCustomerId(e.target.value); setDealId(""); }}
          required
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b3cc26]"
        >
          <option value="">Select a customer…</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {selectedCustomer && selectedCustomer.deals.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-[#1c1e3b] mb-1">Deal <span className="text-gray-400 font-normal">(optional)</span></label>
          <select
            value={dealId}
            onChange={(e) => setDealId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b3cc26]"
          >
            <option value="">No deal</option>
            {selectedCustomer.deals.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      )}

      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <label className="block text-sm font-medium text-[#1c1e3b]">Language</label>
          <SelectTooltip title="Project language" items={languageTooltip} />
        </div>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b3cc26]"
        >
          <option value={Language.DE}>German</option>
          <option value={Language.EN}>English</option>
        </select>
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <label className="block text-sm font-medium text-[#1c1e3b]">Platform <span className="text-gray-400 font-normal">(optional)</span></label>
          <SelectTooltip title="Target platform" items={platformTooltip} />
        </div>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as Platform | "")}
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

      <div>
        <label className="block text-sm font-medium text-[#1c1e3b] mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b3cc26]"
          placeholder="Brief description of the concept…"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-[#b3cc26] text-[#1c1e3b] font-semibold text-sm px-5 py-2 rounded-lg hover:brightness-105 disabled:opacity-50 transition"
        >
          {saving ? "Creating…" : "Create Project"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-[#1c1e3b] px-4 py-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
