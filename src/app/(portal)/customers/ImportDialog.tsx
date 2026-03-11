"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Download, Loader2 } from "lucide-react";

interface HubSpotCompany {
  hubspotId: string;
  name: string;
  domain: string | null;
  industry: string | null;
}

export default function ImportDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [companies, setCompanies] = useState<HubSpotCompany[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/hubspot/companies${q ? `?search=${encodeURIComponent(q)}` : ""}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCompanies(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => fetchCompanies(search), 300);
    return () => clearTimeout(timer);
  }, [open, search, fetchCompanies]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === companies.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(companies.map((c) => c.hubspotId)));
    }
  }

  async function handleImport() {
    if (selected.size === 0) return;
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/hubspot/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hubspotIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOpen(false);
      setSelected(new Set());
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  function handleOpen() {
    setOpen(true);
    setSearch("");
    setSelected(new Set());
    setCompanies([]);
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 bg-[#1c1e3b] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#2a2d52] transition"
      >
        <Download size={14} />
        Import from HubSpot
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-[#1c1e3b]">Import from HubSpot</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-[#1c1e3b]">
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div className="px-6 py-3 border-b border-gray-100">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search companies…"
                  className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b3cc26]"
                  autoFocus
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-gray-400">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              ) : error ? (
                <p className="text-sm text-red-500 text-center py-8">{error}</p>
              ) : companies.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No companies found.</p>
              ) : (
                <>
                  <div
                    className="flex items-center gap-3 px-6 py-2.5 border-b border-gray-50 cursor-pointer hover:bg-gray-50"
                    onClick={toggleAll}
                  >
                    <input
                      type="checkbox"
                      readOnly
                      checked={selected.size === companies.length && companies.length > 0}
                      className="accent-[#b3cc26]"
                    />
                    <span className="text-xs text-gray-500 font-medium">
                      {selected.size === companies.length ? "Deselect all" : `Select all (${companies.length})`}
                    </span>
                  </div>
                  {companies.map((c) => (
                    <div
                      key={c.hubspotId}
                      onClick={() => toggle(c.hubspotId)}
                      className="flex items-center gap-3 px-6 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-50 last:border-0"
                    >
                      <input
                        type="checkbox"
                        readOnly
                        checked={selected.has(c.hubspotId)}
                        className="accent-[#b3cc26]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1c1e3b] truncate">{c.name}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {[c.domain, c.industry].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <span className="text-sm text-gray-500">
                {selected.size > 0 ? `${selected.size} selected` : "Select companies to import"}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setOpen(false)}
                  className="text-sm text-gray-500 hover:text-[#1c1e3b] px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={selected.size === 0 || importing}
                  className="flex items-center gap-2 bg-[#b3cc26] text-[#1c1e3b] font-semibold text-sm px-5 py-2 rounded-lg hover:brightness-105 disabled:opacity-50 transition"
                >
                  {importing && <Loader2 size={14} className="animate-spin" />}
                  {importing ? "Importing…" : `Import ${selected.size > 0 ? selected.size : ""}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
