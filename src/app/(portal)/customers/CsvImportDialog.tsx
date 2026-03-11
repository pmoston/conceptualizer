"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Upload, Loader2, FileText } from "lucide-react";

type CsvType = "companies" | "contacts" | "deals";

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const nonEmpty = lines.filter(l => l.trim());
  if (nonEmpty.length < 2) return [];

  function parseLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current); current = "";
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  const headers = parseLine(nonEmpty[0]);
  return nonEmpty.slice(1).map(line => {
    const values = parseLine(line);
    return Object.fromEntries(headers.map((h, i) => [h.trim(), (values[i] ?? "").trim()]));
  }).filter(row => Object.values(row).some(v => v));
}

export default function CsvImportDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CsvType>("companies");
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      setRows(parsed);
    };
    reader.readAsText(file, "utf-8");
  }

  function handleOpen() {
    setOpen(true);
    setRows(null);
    setFileName("");
    setResult(null);
    setError(null);
    setType("companies");
  }

  async function handleImport() {
    if (!rows || rows.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/customers/csv-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  const typeLabels: Record<CsvType, string> = {
    companies: "Companies",
    contacts: "Contacts",
    deals: "Deals",
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 bg-[#1c1e3b] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#2a2d52] transition"
      >
        <Upload size={14} />
        Import CSV
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-[#1c1e3b]">Import from HubSpot CSV</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-[#1c1e3b]"><X size={18} /></button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Type selector */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">CSV type</label>
                <div className="flex gap-2">
                  {(["companies", "contacts", "deals"] as CsvType[]).map(t => (
                    <button key={t} onClick={() => { setType(t); setRows(null); setFileName(""); setResult(null); if (fileRef.current) fileRef.current.value = ""; }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${type === t ? "bg-[#1c1e3b] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                      {typeLabels[t]}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Export from HubSpot → {typeLabels[type]} → Actions → Export
                </p>
              </div>

              {/* File picker */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">CSV file</label>
                <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-lg px-4 py-3 cursor-pointer hover:border-[#b3cc26] transition">
                  <FileText size={16} className="text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-500 truncate">{fileName || "Click to select a .csv file"}</span>
                  <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
                </label>
              </div>

              {/* Preview */}
              {rows !== null && (
                <p className="text-sm text-gray-600">
                  {rows.length > 0 ? <><span className="font-medium text-[#1c1e3b]">{rows.length}</span> rows ready to import.</> : "No data rows found in file."}
                </p>
              )}

              {/* Result */}
              {result && (
                <div className="rounded-lg bg-green-50 border border-green-100 p-3 text-sm">
                  <p className="font-medium text-green-700">{result.imported} record{result.imported !== 1 ? "s" : ""} imported.</p>
                  {result.errors.length > 0 && (
                    <ul className="mt-1 text-xs text-red-500 space-y-0.5">
                      {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  )}
                </div>
              )}

              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-[#1c1e3b] px-4 py-2">
                {result ? "Close" : "Cancel"}
              </button>
              {!result && (
                <button onClick={handleImport} disabled={!rows || rows.length === 0 || importing}
                  className="flex items-center gap-2 bg-[#b3cc26] text-[#1c1e3b] font-semibold text-sm px-5 py-2 rounded-lg hover:brightness-105 disabled:opacity-50 transition">
                  {importing && <Loader2 size={14} className="animate-spin" />}
                  {importing ? "Importing…" : `Import ${rows && rows.length > 0 ? rows.length + " rows" : ""}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
