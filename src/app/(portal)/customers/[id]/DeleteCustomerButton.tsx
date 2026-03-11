"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

export default function DeleteCustomerButton({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/customers/${customerId}`, { method: "DELETE" });
    router.push("/customers");
    router.refresh();
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Delete this customer?</span>
        <button onClick={() => setConfirm(false)} className="text-sm text-gray-500 hover:text-[#1c1e3b] px-3 py-1.5">Cancel</button>
        <button onClick={handleDelete} disabled={deleting}
          className="flex items-center gap-1.5 bg-red-500 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-red-600 disabled:opacity-50 transition">
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          {deleting ? "Deleting…" : "Confirm"}
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirm(true)}
      className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition">
      <Trash2 size={14} /> Delete
    </button>
  );
}
