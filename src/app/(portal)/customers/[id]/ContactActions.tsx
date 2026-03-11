"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X, Loader2, Mail, Briefcase } from "lucide-react";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  jobTitle: string | null;
}

export default function ContactActions({ customerId, contacts }: { customerId: string; contacts: Contact[] }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", jobTitle: "" });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: form.firstName, lastName: form.lastName, email: form.email || null, jobTitle: form.jobTitle || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowAdd(false);
      setForm({ firstName: "", lastName: "", email: "", jobTitle: "" });
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(contactId: string) {
    setDeletingId(contactId);
    await fetch(`/api/customers/${customerId}/contacts/${contactId}`, { method: "DELETE" });
    setDeletingId(null);
    router.refresh();
  }

  return (
    <section className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-[#1c1e3b]">Contacts ({contacts.length})</h2>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#1c1e3b] border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300 transition">
          <Plus size={12} /> Add Contact
        </button>
      </div>

      {contacts.length === 0 && !showAdd && <p className="text-sm text-gray-400">No contacts yet.</p>}

      <div className="divide-y divide-gray-50">
        {contacts.map(c => (
          <div key={c.id} className="py-3 flex items-start justify-between group">
            <div>
              <p className="font-medium text-sm text-[#1c1e3b]">{c.firstName} {c.lastName}</p>
              {c.jobTitle && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Briefcase size={10} />{c.jobTitle}</p>}
            </div>
            <div className="flex items-center gap-3">
              {c.email && (
                <a href={`mailto:${c.email}`} className="text-xs text-gray-400 hover:text-[#1c1e3b] flex items-center gap-1">
                  <Mail size={10} />{c.email}
                </a>
              )}
              <button onClick={() => handleDelete(c.id)} disabled={deletingId === c.id}
                className="text-gray-300 hover:text-red-400 transition opacity-0 group-hover:opacity-100">
                {deletingId === c.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="mt-3 pt-3 border-t border-gray-100 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">First name *</label>
              <input required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#b3cc26]" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Last name *</label>
              <input required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#b3cc26]" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#b3cc26]" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Job title</label>
            <input value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#b3cc26]" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="text-sm text-gray-500 hover:text-[#1c1e3b] px-3 py-1.5 flex items-center gap-1"><X size={12} /> Cancel</button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-1.5 bg-[#b3cc26] text-[#1c1e3b] font-semibold text-sm px-4 py-1.5 rounded-lg hover:brightness-105 disabled:opacity-50 transition">
              {saving && <Loader2 size={12} className="animate-spin" />}
              {saving ? "Saving…" : "Add Contact"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
