"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X, Loader2, Mail, Briefcase, ExternalLink, Pencil } from "lucide-react";

interface Contact {
  id: string;
  academicTitle: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  jobTitle: string | null;
  hubspotId: string | null;
}

type EditForm = { academicTitle: string; firstName: string; lastName: string; email: string; jobTitle: string; hubspotId: string };

function emptyForm(): EditForm {
  return { academicTitle: "", firstName: "", lastName: "", email: "", jobTitle: "", hubspotId: "" };
}

function contactToForm(c: Contact): EditForm {
  return {
    academicTitle: c.academicTitle ?? "",
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email ?? "",
    jobTitle: c.jobTitle ?? "",
    hubspotId: c.hubspotId ?? "",
  };
}

function ContactForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  saving,
  error,
  submitLabel,
}: {
  form: EditForm;
  setForm: (f: EditForm) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
  submitLabel: string;
}) {
  const cls = "w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#b3cc26]";
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Academic title</label>
        <input value={form.academicTitle} onChange={e => setForm({ ...form, academicTitle: e.target.value })}
          placeholder="e.g. Dr., Prof." className={cls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">First name *</label>
          <input required value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} className={cls} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Last name *</label>
          <input required value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} className={cls} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Email</label>
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={cls} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Job title</label>
          <input value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} className={cls} />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">HubSpot Record ID</label>
        <input value={form.hubspotId} onChange={e => setForm({ ...form, hubspotId: e.target.value })}
          placeholder="e.g. 12345678" className={cls} />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-[#1c1e3b] px-3 py-1.5 flex items-center gap-1">
          <X size={12} /> Cancel
        </button>
        <button type="submit" disabled={saving}
          className="flex items-center gap-1.5 bg-[#b3cc26] text-[#1c1e3b] font-semibold text-sm px-4 py-1.5 rounded-lg hover:brightness-105 disabled:opacity-50 transition">
          {saving && <Loader2 size={12} className="animate-spin" />}
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default function ContactActions({
  customerId,
  contacts,
  portalId,
}: {
  customerId: string;
  contacts: Contact[];
  portalId: string | null;
}) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<EditForm>(emptyForm());
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(emptyForm());
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddSaving(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicTitle: addForm.academicTitle || null,
          firstName: addForm.firstName,
          lastName: addForm.lastName,
          email: addForm.email || null,
          jobTitle: addForm.jobTitle || null,
          hubspotId: addForm.hubspotId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowAdd(false);
      setAddForm(emptyForm());
      router.refresh();
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : "Failed");
    } finally {
      setAddSaving(false);
    }
  }

  function startEdit(c: Contact) {
    setEditingId(c.id);
    setEditForm(contactToForm(c));
    setEditError(null);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/contacts/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicTitle: editForm.academicTitle || null,
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          email: editForm.email || null,
          jobTitle: editForm.jobTitle || null,
          hubspotId: editForm.hubspotId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEditingId(null);
      router.refresh();
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : "Failed");
    } finally {
      setEditSaving(false);
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
        <button onClick={() => { setShowAdd(true); setEditingId(null); }}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#1c1e3b] border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300 transition">
          <Plus size={12} /> Add Contact
        </button>
      </div>

      {contacts.length === 0 && !showAdd && <p className="text-sm text-gray-400">No contacts yet.</p>}

      <div className="divide-y divide-gray-50">
        {contacts.map(c => (
          <div key={c.id}>
            {editingId === c.id ? (
              <div className="py-3">
                <ContactForm form={editForm} setForm={setEditForm} onSubmit={handleEdit}
                  onCancel={() => setEditingId(null)} saving={editSaving} error={editError} submitLabel="Save" />
              </div>
            ) : (
              <div className="py-3 flex items-start justify-between group">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-[#1c1e3b]">
                      {c.academicTitle && <span className="text-gray-400 font-normal">{c.academicTitle} </span>}
                      {c.firstName} {c.lastName}
                    </p>
                    {c.hubspotId && portalId && (
                      <a href={`https://app.hubspot.com/contacts/${portalId}/contact/${c.hubspotId}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-gray-300 hover:text-[#ff7a59] transition" title="View in HubSpot">
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  {c.jobTitle && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Briefcase size={10} />{c.jobTitle}</p>}
                </div>
                <div className="flex items-center gap-3">
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="text-xs text-gray-400 hover:text-[#1c1e3b] flex items-center gap-1">
                      <Mail size={10} />{c.email}
                    </a>
                  )}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => startEdit(c)} className="text-gray-300 hover:text-[#1c1e3b] transition p-0.5">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(c.id)} disabled={deletingId === c.id}
                      className="text-gray-300 hover:text-red-400 transition p-0.5">
                      {deletingId === c.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <ContactForm form={addForm} setForm={setAddForm} onSubmit={handleAdd}
            onCancel={() => { setShowAdd(false); setAddForm(emptyForm()); }}
            saving={addSaving} error={addError} submitLabel="Add Contact" />
        </div>
      )}
    </section>
  );
}
