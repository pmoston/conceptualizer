"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X, Loader2, ExternalLink, Pencil } from "lucide-react";

interface Deal {
  id: string;
  name: string;
  stage: string | null;
  amount: number | null;
  currency: string | null;
  closeDate: Date | string | null;
  ownerName: string | null;
  hubspotId: string | null;
}

type EditForm = { name: string; stage: string; amount: string; currency: string; closeDate: string; ownerName: string; hubspotId: string };

function emptyForm(): EditForm {
  return { name: "", stage: "", amount: "", currency: "", closeDate: "", ownerName: "", hubspotId: "" };
}

function dealToForm(d: Deal): EditForm {
  return {
    name: d.name,
    stage: d.stage ?? "",
    amount: d.amount != null ? String(d.amount) : "",
    currency: d.currency ?? "",
    closeDate: d.closeDate ? new Date(d.closeDate).toISOString().split("T")[0] : "",
    ownerName: d.ownerName ?? "",
    hubspotId: d.hubspotId ?? "",
  };
}

function DealForm({
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
        <label className="block text-xs text-gray-500 mb-1">Deal name *</label>
        <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={cls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Stage</label>
          <input value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })} className={cls} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Owner</label>
          <input value={form.ownerName} onChange={e => setForm({ ...form, ownerName: e.target.value })} className={cls} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Amount</label>
          <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className={cls} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Currency</label>
          <input value={form.currency} placeholder="EUR" onChange={e => setForm({ ...form, currency: e.target.value })} className={cls} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Close date</label>
          <input type="date" value={form.closeDate} onChange={e => setForm({ ...form, closeDate: e.target.value })} className={cls} />
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

export default function DealActions({
  customerId,
  deals,
  portalId,
}: {
  customerId: string;
  deals: Deal[];
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

  function formToPayload(f: EditForm) {
    return {
      name: f.name,
      stage: f.stage || null,
      amount: f.amount ? parseFloat(f.amount) : null,
      currency: f.currency || null,
      closeDate: f.closeDate || null,
      ownerName: f.ownerName || null,
      hubspotId: f.hubspotId || null,
    };
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddSaving(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/deals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToPayload(addForm)),
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

  function startEdit(d: Deal) {
    setEditingId(d.id);
    setEditForm(dealToForm(d));
    setEditError(null);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/deals/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToPayload(editForm)),
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

  async function handleDelete(dealId: string) {
    setDeletingId(dealId);
    await fetch(`/api/customers/${customerId}/deals/${dealId}`, { method: "DELETE" });
    setDeletingId(null);
    router.refresh();
  }

  return (
    <section className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-[#1c1e3b]">Deals ({deals.length})</h2>
        <button onClick={() => { setShowAdd(true); setEditingId(null); }}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#1c1e3b] border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300 transition">
          <Plus size={12} /> Add Deal
        </button>
      </div>

      {deals.length === 0 && !showAdd && <p className="text-sm text-gray-400">No deals yet.</p>}

      <div className="divide-y divide-gray-50">
        {deals.map(d => (
          <div key={d.id}>
            {editingId === d.id ? (
              <div className="py-3">
                <DealForm form={editForm} setForm={setEditForm} onSubmit={handleEdit}
                  onCancel={() => setEditingId(null)} saving={editSaving} error={editError} submitLabel="Save" />
              </div>
            ) : (
              <div className="py-3 flex items-center justify-between group">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-[#1c1e3b]">{d.name}</p>
                    {d.hubspotId && portalId && (
                      <a href={`https://app.hubspot.com/contacts/${portalId}/deal/${d.hubspotId}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-gray-300 hover:text-[#ff7a59] transition" title="View in HubSpot">
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{d.stage ?? "—"}{d.ownerName ? ` · ${d.ownerName}` : ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    {d.amount != null && (
                      <p className="text-sm font-medium text-[#1c1e3b]">{d.currency ?? ""} {d.amount.toLocaleString()}</p>
                    )}
                    {d.closeDate && (
                      <p className="text-xs text-gray-400">{new Date(d.closeDate).toLocaleDateString()}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => startEdit(d)} className="text-gray-300 hover:text-[#1c1e3b] transition p-0.5">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(d.id)} disabled={deletingId === d.id}
                      className="text-gray-300 hover:text-red-400 transition p-0.5">
                      {deletingId === d.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
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
          <DealForm form={addForm} setForm={setAddForm} onSubmit={handleAdd}
            onCancel={() => { setShowAdd(false); setAddForm(emptyForm()); }}
            saving={addSaving} error={addError} submitLabel="Add Deal" />
        </div>
      )}
    </section>
  );
}
