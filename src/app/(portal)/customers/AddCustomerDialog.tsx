"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, Plus } from "lucide-react";

export default function AddCustomerDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", domain: "", industry: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, domain: form.domain || null, industry: form.industry || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOpen(false);
      setForm({ name: "", domain: "", industry: "" });
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
        className="flex items-center gap-2 bg-white border border-gray-200 text-[#1c1e3b] text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition"
      >
        <Plus size={14} />
        Add Customer
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-[#1c1e3b]">Add Customer</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-[#1c1e3b]"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Company name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b3cc26]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Domain</label>
                <input value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
                  placeholder="example.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b3cc26]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Industry</label>
                <input value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b3cc26]" />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-[#1c1e3b] px-4 py-2">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 bg-[#b3cc26] text-[#1c1e3b] font-semibold text-sm px-5 py-2 rounded-lg hover:brightness-105 disabled:opacity-50 transition">
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {saving ? "Saving…" : "Add Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
