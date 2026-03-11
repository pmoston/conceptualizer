export interface PrereqDoc {
  type: string;
  ocrText: string | null;
  name: string;
}

export interface PrereqRun {
  agentName: string;
  status: string;
}

export interface PrerequisiteResult {
  ok: boolean;
  missing: string[];
}

const NEEDS_DRAFT = [
  "fact-check",
  "humanize",
  "corporate-design-review",
  "translate",
  "executive-summary",
  "qa-checklist",
];

export function checkPrerequisites(
  agentName: string,
  documents: PrereqDoc[],
): PrerequisiteResult {
  const missing: string[] = [];

  const sourceDocs = documents.filter(d => d.type === "SOURCE_MATERIAL");
  const draftDocs  = documents.filter(d => d.type === "DRAFT" || d.type === "FINAL");

  if (agentName === "read-materials" || agentName === "draft") {
    if (sourceDocs.length === 0) {
      missing.push("Upload at least one Source Material document.");
    }
  }

  if (NEEDS_DRAFT.includes(agentName)) {
    if (draftDocs.length === 0) {
      missing.push(
        "Upload a Draft or Final document, or run the Draft agent first to generate one.",
      );
    }
  }

  return { ok: missing.length === 0, missing };
}
