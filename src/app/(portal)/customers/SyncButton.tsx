"use client";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  async function handleSync() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/customers/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const { synced } = data;
      setResult(`Synced ${synced.companies} companies, ${synced.contacts} contacts, ${synced.deals} deals`);
      router.refresh();
    } catch (e: unknown) {
      setResult(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleSync}
        disabled={loading}
        className="flex items-center gap-2 bg-[#1c1e3b] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#2a2d52] disabled:opacity-50 transition"
      >
        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        {loading ? "Syncing…" : "Sync HubSpot"}
      </button>
      {result && <p className="text-xs text-gray-500">{result}</p>}
    </div>
  );
}
