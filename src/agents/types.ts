import { Language } from "@prisma/client";

/**
 * A single uploaded project document with its content from each available source tier.
 *
 * Source hierarchy used by read-materials:
 *   1. Primary   — fileData (the actual uploaded file, sent as base64 when supported)
 *   2. Secondary — ocrText  (text extracted from the file by the converter)
 *   3. Tertiary  — MCP / online lookup tools (injected at runtime, not stored here)
 *   4. Fourth    — model training data (implicit fallback)
 */
export interface DocumentSource {
  name:      string;
  docType:   "SOURCE_MATERIAL" | "SUPPORTING" | "DRAFT" | "FINAL";
  mimeType:  string;
  sizeBytes: number;
  /** Secondary source: OCR / text extraction from the converter */
  ocrText:   string | null;
  /**
   * Primary source: base64-encoded file content.
   * Only populated for PDF/image files ≤ 4 MB when USE_CLOUD_MODELS=true.
   * Undefined for local Ollama runs or files that are too large / unsupported.
   */
  fileData?: string;
}

export interface AgentInput {
  projectTitle:    string;
  language:        Language;
  description?:   string | null;
  /** Text-only source context used by all agents. */
  sourceMaterials: string;
  /**
   * Structured per-file sources — populated for the read-materials agent only.
   * When present the agent uses this instead of the flat sourceMaterials string
   * so it can distinguish primary (file) from secondary (OCR) content.
   */
  documentSources?: DocumentSource[];
  currentDraft?:   string | null;
  instructions?:   string | null;
}
