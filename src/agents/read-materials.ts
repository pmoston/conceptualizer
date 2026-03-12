import { streamText, type Tool } from "ai";
import type { UserContent } from "@ai-sdk/provider-utils";
import { AgentModels } from "@/lib/models";
import type { AgentInput, DocumentSource } from "./types";

// MIME types Claude can receive as native file attachments (Anthropic API)
const FILE_MIME_TYPES = new Set(["application/pdf"]);
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]);

function systemPrompt(lang: string, hasMcp: boolean): string {
  return `You are a senior consultant at Dataciders GmbH, a data & AI consulting firm.
Your task is to thoroughly read and analyse ALL documents provided for this project and produce a structured, MECE brief.
Produce your output in ${lang}.

You have access to information from multiple source tiers — always respect this priority order:

1. PRIMARY — Actual uploaded files (the project documents themselves). These are the authoritative ground truth. If a file is attached, read it completely before consulting any other source.
2. SECONDARY — OCR-extracted text from those files. Use this to supplement or re-read content that may be unclear in the primary source, or where only text is available.
3. TERTIARY — Online lookups from official sources${hasMcp ? " (Microsoft Learn documentation tools are available — use them to verify technical claims, product names, feature availability, and service specifications)" : " (no online tools available in this run)"}. Use these to fill gaps that the uploaded documents do not cover.
4. FOURTH — Your training knowledge. Use only as a last resort for general consulting context, industry standards, or background that the project documents do not provide. Always flag when you are drawing on training knowledge rather than the provided documents.

Do not speculate or infer beyond what the sources support. Cite the source tier when the basis for a fact matters.

Apply the Kepner-Tregoe Situation Appraisal framework:
- Identify and separate each concern as a distinct issue
- Prioritize by impact (effect if unresolved) × urgency (time pressure)
- Assign analysis type: Problem / Decision / Plan / Opportunity`;
}

function formatOcrBlock(doc: DocumentSource): string {
  const typeLabel = {
    SOURCE_MATERIAL: "Source Material",
    SUPPORTING:      "Supporting Document",
    DRAFT:           "Draft",
    FINAL:           "Final Document",
  }[doc.docType] ?? doc.docType;

  const textContent = doc.ocrText?.trim()
    ? doc.ocrText
    : "(No text could be extracted from this file — file may be image-only, password-protected, or corrupt)";

  return `[${typeLabel}: "${doc.name}" | ${doc.mimeType} | ${(doc.sizeBytes / 1024).toFixed(0)} KB]\n${textContent}`;
}

function buildPromptFooter(input: AgentInput): string {
  return `${input.instructions ? `Additional instructions / context from previous dialogue:\n${input.instructions}\n\n` : ""}Analyse ALL the documents above using the Kepner-Tregoe Situation Appraisal framework and produce a structured brief:

1. **Document Inventory** — List every document provided (name, type, key content summary). Note any documents with missing or partial text extraction.

2. **Key Facts** — The most important facts, figures, and context from the materials. Cite the source document by name. Use exact numbers and names from the source.

3. **Client Needs & Goals** — What the client wants to achieve. Distinguish stated goals (explicitly mentioned) from implied goals (inferable from context). Flag the distinction.

4. **Concerns Appraisal (KT Situation Appraisal)** — List each distinct concern separately. For each:
   - Concern name and description
   - Priority: Impact (High / Medium / Low) × Urgency (High / Medium / Low)
   - Analysis type needed: Problem / Decision / Plan / Opportunity

5. **Constraints & Risks** — Budget, timeline, technical, regulatory, or organisational constraints evidenced in the documents.

6. **Open Questions for Clarification** — Gaps in the materials that must be clarified before a concept can be drafted. Only list genuine gaps not already answered by the documents, online lookups, or training knowledge.

7. **Recommended Focus Areas** — Based on the appraisal, which concerns should the concept prioritise? Explain why.

Finally, on its own line at the very end of your response, always write one of the following (in English — machine-readable marker):
QUESTIONS_FOLLOW: YES   ← section 6 contains one or more open questions requiring user input before drafting
QUESTIONS_FOLLOW: NO    ← the materials are complete enough to proceed to drafting without clarification`;
}

export function runReadMaterialsAgent(
  input: AgentInput,
  tools?: Record<string, Tool>,
) {
  const lang   = input.language === "DE" ? "German" : "English";
  const hasMcp = !!(tools && Object.keys(tools).length > 0);
  const system = systemPrompt(lang, hasMcp);
  const footer = buildPromptFooter(input);

  // ── Rich path: per-file document sources with optional file attachments ──────
  if (input.documentSources && input.documentSources.length > 0) {
    const primary   = input.documentSources.filter(d => d.docType === "SOURCE_MATERIAL" || d.docType === "SUPPORTING");
    const reference = input.documentSources.filter(d => d.docType === "DRAFT" || d.docType === "FINAL");

    const content: UserContent = [];

    // Project header
    content.push({
      type: "text",
      text: `Project: ${input.projectTitle}${input.description ? `\nDescription: ${input.description}` : ""}\n\n` +
            `You are reviewing ${input.documentSources.length} document(s) using the four-tier source hierarchy described in your instructions.\n\n` +
            `═══ PRIMARY / SECONDARY SOURCES ═══`,
    });

    // Primary/secondary documents
    for (const doc of primary) {
      // Secondary header (always present)
      content.push({ type: "text", text: `\n--- ${formatOcrBlock(doc).split("\n")[0]} ---` });

      // Primary: actual file attachment (PDF / image — cloud models only)
      if (doc.fileData) {
        if (FILE_MIME_TYPES.has(doc.mimeType)) {
          content.push({ type: "file", data: doc.fileData, mediaType: doc.mimeType });
          content.push({ type: "text", text: `[PRIMARY] File attached above — read this first.\n[SECONDARY] OCR extraction follows:` });
        } else if (IMAGE_MIME_TYPES.has(doc.mimeType)) {
          content.push({ type: "image", image: doc.fileData, mediaType: doc.mimeType });
          content.push({ type: "text", text: `[PRIMARY] Image attached above — analyse this first.\n[SECONDARY] OCR extraction follows:` });
        }
      } else {
        content.push({ type: "text", text: `[PRIMARY file not transmitted — using SECONDARY source only]` });
      }

      // Secondary: OCR text
      const ocrText = doc.ocrText?.trim()
        ? doc.ocrText
        : "(No text could be extracted from this file)";
      content.push({ type: "text", text: `[SECONDARY — OCR/extracted text]\n${ocrText}` });
    }

    // Reference documents (drafts/finals)
    if (reference.length > 0) {
      content.push({ type: "text", text: `\n═══ REFERENCE DOCUMENTS (existing drafts / finals) ═══` });
      for (const doc of reference) {
        content.push({ type: "text", text: formatOcrBlock(doc) });
      }
    }

    if (primary.length === 0 && reference.length === 0) {
      content.push({ type: "text", text: "No documents uploaded to this project." });
    }

    // Footer / instructions
    content.push({ type: "text", text: `\n═══ ANALYSIS INSTRUCTIONS ═══\n${footer}` });

    return streamText({
      model:    AgentModels["read-materials"],
      system,
      messages: [{ role: "user", content }],
      ...(hasMcp ? { tools, maxSteps: 5 } : {}),
    });
  }

  // ── Fallback path: plain text prompt (Ollama or no document sources) ─────────
  return streamText({
    model: AgentModels["read-materials"],
    system,
    prompt: `Project: ${input.projectTitle}
${input.description ? `Description: ${input.description}\n` : ""}
${input.sourceMaterials}

${footer}`,
    ...(hasMcp ? { tools, maxSteps: 5 } : {}),
  });
}
