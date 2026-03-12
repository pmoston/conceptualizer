import { NextRequest } from "next/server";
import fs from "fs/promises";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkPrerequisites } from "@/lib/agentPrerequisites";
import { encode, type StepKind } from "@/lib/agentStream";
import { parseQuestions } from "@/lib/agentQuestions";
import type { AgentInput, DocumentSource } from "@/agents/types";
import { createMCPClient } from "@ai-sdk/mcp";
import type { Tool } from "ai";
import { runReadMaterialsAgent } from "@/agents/read-materials";
import { runDraftAgent } from "@/agents/draft";
import { runFactCheckAgent } from "@/agents/fact-check";
import { runHumanizeAgent } from "@/agents/humanize";
import { runCorporateDesignReviewAgent } from "@/agents/corporate-design-review";
import { runTranslateAgent } from "@/agents/translate";
import { runExecutiveSummaryAgent } from "@/agents/executive-summary";
import { runQaChecklistAgent } from "@/agents/qa-checklist";
import type { AgentStatus, StepType } from "@prisma/client";

const agentRegistry: Record<string, (input: AgentInput, tools?: Record<string, Tool>) => ReturnType<typeof runDraftAgent>> = {
  "read-materials":          runReadMaterialsAgent,
  "draft":                   runDraftAgent,
  "fact-check":              runFactCheckAgent,
  "humanize":                runHumanizeAgent,
  "corporate-design-review": runCorporateDesignReviewAgent,
  "translate":               runTranslateAgent,
  "executive-summary":       runExecutiveSummaryAgent,
  "qa-checklist":            runQaChecklistAgent,
};

const agentLabels: Record<string, string> = {
  "read-materials":          "Read Materials",
  "draft":                   "Draft Concept",
  "fact-check":              "Fact-Check",
  "humanize":                "Humanize",
  "corporate-design-review": "Corporate Design Review",
  "translate":               "Translate",
  "executive-summary":       "Executive Summary",
  "qa-checklist":            "QA Checklist",
};

const kindToDbType: Record<StepKind, StepType> = {
  info:         "INFO",
  agent_call:   "AGENT_CALL",
  agent_output: "AGENT_OUTPUT",
  tool_call:    "TOOL_CALL",
  tool_result:  "TOOL_RESULT",
  warning:      "WARNING",
  error:        "ERROR",
};

// ─── File attachment helpers ────────────────────────────────────────────────
// Files sent inline as base64 (primary source tier). Only for cloud models,
// only for supported MIME types, only if the file fits within API limits.
const CLOUD_MODELS = process.env.USE_CLOUD_MODELS === "true";

// Anthropic supports inline PDF + images (≤ 4 MB after base64 encoding ≈ 3 MB raw)
const SENDABLE_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
]);
const MAX_FILE_BYTES_INLINE = 3 * 1024 * 1024; // 3 MB raw

/** Read a file from disk and return base64, or undefined on failure / size exceeded. */
async function readFileAsBase64(
  filePath: string,
  sizeBytes: number,
  mimeType: string,
): Promise<string | undefined> {
  if (!CLOUD_MODELS) return undefined;
  if (!SENDABLE_MIME_TYPES.has(mimeType)) return undefined;
  if (sizeBytes > MAX_FILE_BYTES_INLINE) return undefined;
  try {
    const buf = await fs.readFile(filePath);
    return buf.toString("base64");
  } catch {
    // File not accessible in this environment (e.g. local dev with container paths)
    return undefined;
  }
}

/** Build a DocumentSource for every project document, reading files where possible. */
async function buildDocumentSources(
  documents: Array<{
    name: string; type: string; mimeType: string; sizeBytes: number;
    ocrText: string | null; filePath: string;
  }>,
): Promise<DocumentSource[]> {
  return Promise.all(
    documents.map(async doc => ({
      name:      doc.name,
      docType:   doc.type as DocumentSource["docType"],
      mimeType:  doc.mimeType,
      sizeBytes: doc.sizeBytes,
      ocrText:   doc.ocrText,
      fileData:  await readFileAsBase64(doc.filePath, doc.sizeBytes, doc.mimeType),
    })),
  );
}

// ─── Content limits to stay within model context windows ─────────────────────
const MAX_SOURCE_CHARS    = 80_000;  // ~20k tokens
const MAX_DRAFT_CHARS     = 40_000;  // ~10k tokens
const MAX_INSTRUCTIONS_CHARS = 4_000;
const MAX_FEEDBACK_CHARS  = 8_000;

function truncate(text: string, max: number, label: string): string {
  if (text.length <= max) return text;
  const kept = text.slice(0, max);
  return `${kept}\n\n[${label} truncated at ${max} characters — ${text.length - max} chars omitted]`;
}

// Scan last N lines of text for a machine-readable marker
function scanLastLines(text: string, passMarker: string, failMarker: string): boolean | null {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 5); i--) {
    const line = lines[i].toUpperCase();
    if (line.includes(passMarker)) return true;
    if (line.includes(failMarker)) return false;
  }
  return null; // marker not found
}

// Reliable verdict parsing: fact-check agent always ends with VERDICT: PASS or VERDICT: FAIL
function factCheckPasses(fcText: string): boolean {
  return scanLastLines(fcText, "VERDICT: PASS", "VERDICT: FAIL") ?? false;
}

// CDR agent ends with CDR_VERDICT: PASS or CDR_VERDICT: FAIL
function cdrPasses(cdrText: string): boolean {
  return scanLastLines(cdrText, "CDR_VERDICT: PASS", "CDR_VERDICT: FAIL") ?? false;
}

// read-materials agent ends with QUESTIONS_FOLLOW: YES/NO
function hasOpenQuestions(text: string): boolean {
  return scanLastLines(text, "QUESTIONS_FOLLOW: YES", "QUESTIONS_FOLLOW: NO") ?? false;
}

type Params = { params: Promise<{ agentName: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try { await requireAuth(); } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const { agentName } = await params;
  if (!agentRegistry[agentName]) {
    return new Response(`Unknown agent: ${agentName}`, { status: 404 });
  }

  // Validate and parse body
  let body: { projectId?: unknown; instructions?: unknown };
  try {
    body = await req.json() as typeof body;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const projectId    = typeof body.projectId    === "string" ? body.projectId.trim()    : null;
  const instructions = typeof body.instructions === "string" ? body.instructions.trim() : null;

  if (!projectId) return new Response("projectId required", { status: 400 });

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { documents: { orderBy: { createdAt: "desc" } } },
  });
  if (!project) return new Response("Project not found", { status: 404 });

  // Prerequisite check
  const prereq = checkPrerequisites(agentName, project.documents);
  if (!prereq.ok) {
    return new Response(
      JSON.stringify({ error: "prerequisites_not_met", missing: prereq.missing }),
      { status: 422, headers: { "Content-Type": "application/json" } },
    );
  }

  // Build context from documents — apply length limits
  // SOURCE_MATERIAL + SUPPORTING go into sourceMaterials for all agents.
  // DRAFT / FINAL provide the current working draft.
  const sourceDocs     = project.documents.filter(d => d.type === "SOURCE_MATERIAL" || d.type === "SUPPORTING");
  const draftDocs      = project.documents.filter(d => d.type === "DRAFT" || d.type === "FINAL");

  function docLabel(d: { type: string }): string {
    return d.type === "SUPPORTING" ? "Supporting" : "Source";
  }

  const rawSourceMaterials =
    sourceDocs.length > 0
      ? sourceDocs.map(d => `[${docLabel(d)}: ${d.name}]\n${d.ocrText ?? "(no extracted text)"}`).join("\n\n---\n\n")
      : "No source materials available.";

  const rawCurrentDraft =
    draftDocs.length > 0
      ? `[${draftDocs[0].name}]\n${draftDocs[0].ocrText ?? "(no extracted text)"}`
      : null;

  const sourceMaterials  = truncate(rawSourceMaterials, MAX_SOURCE_CHARS, "source materials");
  const currentDraft     = rawCurrentDraft ? truncate(rawCurrentDraft, MAX_DRAFT_CHARS, "draft") : null;
  const safeInstructions = instructions ? truncate(instructions, MAX_INSTRUCTIONS_CHARS, "instructions") : null;

  // For read-materials: build rich per-file document sources (all document types, with optional file attachments)
  const documentSources = agentName === "read-materials"
    ? await buildDocumentSources(project.documents)
    : undefined;

  const baseInput: AgentInput = {
    projectTitle:    project.title || "(Untitled project)",
    language:        project.language,
    description:     project.description ? truncate(project.description, 1_000, "description") : null,
    sourceMaterials,
    documentSources,
    currentDraft,
    instructions:    safeInstructions,
  };

  // Set up MCP client — for agents that can consult external documentation
  const MCP_AGENTS = new Set(["fact-check", "read-materials"]);
  let mcpTools: Record<string, Tool> = {};
  let mcpClient: Awaited<ReturnType<typeof createMCPClient>> | null = null;
  const mcpUrl = process.env.MSDOCS_MCP_URL;
  if (mcpUrl && MCP_AGENTS.has(agentName)) {
    try {
      mcpClient = await createMCPClient({ transport: { type: "sse", url: mcpUrl } });
      mcpTools  = await mcpClient.tools();
    } catch (err) {
      console.error("MCP client setup failed (continuing without tools):", err);
      mcpClient = null;
      mcpTools  = {};
    }
  }

  // Create run record
  const agentRun = await db.agentRun.create({
    data: {
      agentName,
      status:    "RUNNING" as AgentStatus,
      input:     { projectId, instructions: safeInstructions },
      projectId,
    },
  });

  let stepIndex = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Parameters<typeof encode>[0]) =>
        controller.enqueue(encode(data));

      function emitStep(kind: StepKind, label: string, content?: string) {
        void db.agentStep
          .create({
            data: {
              runId:   agentRun.id,
              index:   ++stepIndex,
              type:    kindToDbType[kind],
              label,
              content: content ?? null,
            },
          })
          .catch(err => console.error("AgentStep write failed:", err));
        send({ t: "step", kind, label, content });
      }

      async function streamAgent(name: string, input: AgentInput): Promise<string> {
        const hasMcp = MCP_AGENTS.has(name) && Object.keys(mcpTools).length > 0;
        emitStep(
          "agent_call",
          `Calling ${agentLabels[name] ?? name}…${hasMcp ? " (with Microsoft Learn docs)" : ""}`,
        );
        if (hasMcp) emitStep("tool_call", "Loading Microsoft Learn documentation tools…");

        const result = hasMcp
          ? agentRegistry[name](input, mcpTools)
          : agentRegistry[name](input);

        let text = "";
        try {
          for await (const chunk of result.textStream) {
            text += chunk;
            send({ t: "delta", text: chunk });
          }
        } catch (streamErr: unknown) {
          const msg = streamErr instanceof Error ? streamErr.message : String(streamErr);
          emitStep("error", `Stream error in ${agentLabels[name] ?? name}: ${msg}`);
          throw streamErr;
        }

        emitStep("agent_output", `${agentLabels[name] ?? name} complete`, text);
        return text;
      }

      // Audit log helper — fire-and-forget; errors are logged but don't abort the run
      const logAudit = (iteration: number, phase: string, verdict: string | null, details: string) =>
        db.workflowAuditLog
          .create({ data: { runId: agentRun.id, iteration, phase, verdict, details } })
          .catch(err => console.error("WorkflowAuditLog write failed:", err));

      let fullOutput = "";

      try {
        emitStep("info", "Prerequisites verified. Starting agent run…");
        void logAudit(0, "RUN_START", null, `Agent ${agentName} started for project ${projectId}`);

        if (agentName === "draft") {
          // Draft + Fact-Check feedback loop (max 3 iterations)
          const MAX = 3;
          let factCheckFeedback = "";
          let passed = false;

          for (let i = 1; i <= MAX && !passed; i++) {
            // Limit accumulated feedback to avoid unbounded context growth
            const truncatedFeedback = factCheckFeedback
              ? truncate(factCheckFeedback, MAX_FEEDBACK_CHARS, "fact-check feedback")
              : "";

            const draftInput: AgentInput = {
              ...baseInput,
              instructions: [safeInstructions, truncatedFeedback
                ? `Apply the following fact-check corrections:\n${truncatedFeedback}`
                : "",
              ].filter(Boolean).join("\n\n") || null,
            };

            emitStep("info", `Draft–FactCheck loop: iteration ${i}/${MAX}`);
            void logAudit(i, "DRAFT", null, `Draft iteration ${i}/${MAX} started`);
            fullOutput = await streamAgent("draft", draftInput);

            emitStep("info", "Verifying draft with fact-check agent…");
            const fcInput: AgentInput = { ...baseInput, currentDraft: truncate(fullOutput, MAX_DRAFT_CHARS, "draft") };
            factCheckFeedback = await streamAgent("fact-check", fcInput);

            passed = factCheckPasses(factCheckFeedback);
            void logAudit(i, "FACT_CHECK", passed ? "PASS" : "FAIL",
              passed ? `Fact-check passed on iteration ${i}` : `Fact-check failed on iteration ${i}; revising`);

            if (passed) {
              emitStep("info", `✓ Fact-check passed after ${i} iteration(s). Draft is complete.`);
            } else if (i < MAX) {
              emitStep("warning", `Issues found. Revising draft (iteration ${i + 1}/${MAX})…`);
            } else {
              emitStep("warning", `Maximum iterations (${MAX}) reached. Using latest draft.`);
              void logAudit(i, "DRAFT_LOOP_EXHAUSTED", "WARN", `Max draft iterations (${MAX}) reached`);
            }
          }

        } else if (agentName === "corporate-design-review") {
          // CDR loop: CDR → Draft revision → Fact-Check → Humanize → CDR (repeat until PASS or max)
          const MAX_CDR = 3;
          let currentDraftText = currentDraft ?? "";
          let finalCdrReport  = "";
          let cdrPassed       = false;

          void logAudit(0, "CDR_LOOP_START", null,
            `CDR quality loop started. Max iterations: ${MAX_CDR}. Draft length: ${currentDraftText.length} chars.`);

          for (let i = 1; i <= MAX_CDR; i++) {
            emitStep("info", `CDR Workflow: iteration ${i} of ${MAX_CDR}`);
            void logAudit(i, "CDR_ITERATION_START", null, `Iteration ${i}/${MAX_CDR} started`);

            // Step 1: Corporate Design Review
            const cdrIterInput: AgentInput = {
              ...baseInput,
              currentDraft: truncate(currentDraftText, MAX_DRAFT_CHARS, "draft"),
            };
            finalCdrReport = await streamAgent("corporate-design-review", cdrIterInput);
            cdrPassed = cdrPasses(finalCdrReport);

            void logAudit(i, "CDR", cdrPassed ? "PASS" : "FAIL",
              cdrPassed
                ? `CDR iteration ${i}: no CRITICAL or HIGH issues — document approved`
                : `CDR iteration ${i}: CRITICAL/HIGH issues found — initiating revision cycle`);

            if (cdrPassed) {
              emitStep("info", `✓ CDR passed after ${i} iteration(s). Document approved.`);
              break;
            }

            if (i >= MAX_CDR) {
              emitStep("warning", `Maximum CDR iterations (${MAX_CDR}) reached. Unresolved findings remain.`);
              void logAudit(i, "CDR_LOOP_EXHAUSTED", "WARN",
                `Max iterations (${MAX_CDR}) reached; CDR still fails. Proceeding with latest draft.`);
              break;
            }

            emitStep("warning", `CDR found issues. Starting revision cycle (iteration ${i + 1}/${MAX_CDR})…`);

            // Step 2: Revise draft based on CDR feedback
            const truncatedCdrFeedback = truncate(finalCdrReport, MAX_FEEDBACK_CHARS, "CDR feedback");
            const revisionInstructions = [
              safeInstructions,
              `REVISION: Apply the following Corporate Design Review corrections.\n` +
              `Address all 🔴 CRITICAL and 🟡 HIGH severity items. Preserve correct sections unchanged.\n\n` +
              `CDR FINDINGS:\n${truncatedCdrFeedback}`,
            ].filter(Boolean).join("\n\n");

            const revisionInput: AgentInput = {
              ...baseInput,
              currentDraft: truncate(currentDraftText, MAX_DRAFT_CHARS, "current draft"),
              instructions: revisionInstructions,
            };
            emitStep("info", "Revising draft based on CDR findings…");
            currentDraftText = await streamAgent("draft", revisionInput);
            void logAudit(i, "DRAFT_REVISION", null,
              `Draft revised to address CDR iteration ${i} findings (${currentDraftText.length} chars)`);

            // Step 3: Fact-check the revised draft
            emitStep("info", "Fact-checking revised draft…");
            const fcIterInput: AgentInput = {
              ...baseInput,
              currentDraft: truncate(currentDraftText, MAX_DRAFT_CHARS, "revised draft"),
            };
            const fcReport  = await streamAgent("fact-check", fcIterInput);
            const fcPassed  = factCheckPasses(fcReport);
            void logAudit(i, "FACT_CHECK", fcPassed ? "PASS" : "FAIL",
              fcPassed
                ? "Revised draft passes fact-check"
                : "Fact-check issues detected — noted; CDR re-review will assess");

            if (fcPassed) {
              emitStep("info", "✓ Revised draft passes fact-check.");
            } else {
              emitStep("warning", "Fact-check flagged issues — CDR will assess in next iteration.");
            }

            // Step 4: Humanize the revised draft
            emitStep("info", "Humanizing revised draft…");
            const humanizeIterInput: AgentInput = {
              ...baseInput,
              currentDraft: truncate(currentDraftText, MAX_DRAFT_CHARS, "revised draft"),
            };
            currentDraftText = await streamAgent("humanize", humanizeIterInput);
            void logAudit(i, "HUMANIZE", null,
              `Draft humanized after iteration ${i} revision (${currentDraftText.length} chars). Proceeding to CDR iteration ${i + 1}.`);
          }

          const cdrHeader = cdrPassed
            ? "## ✓ Corporate Design Review — APPROVED"
            : "## ⚠ Corporate Design Review — ISSUES REMAIN (maximum iterations reached)";

          fullOutput = `${currentDraftText}\n\n---\n\n${cdrHeader}\n\n${finalCdrReport}`;
          void logAudit(MAX_CDR, "CDR_LOOP_END", cdrPassed ? "PASS" : "FAIL",
            `CDR loop complete. Final verdict: ${cdrPassed ? "APPROVED" : "ISSUES REMAIN"}.`);

        } else {
          // Single agent run
          fullOutput = await streamAgent(agentName, baseInput);
        }

        // Any dialogue-enabled agent may pause and request user input
        const DIALOGUE_AGENTS = ["read-materials", "draft"];
        if (DIALOGUE_AGENTS.includes(agentName) && hasOpenQuestions(fullOutput)) {
          const questions = parseQuestions(fullOutput);
          await db.agentRun.update({
            where: { id: agentRun.id },
            data:  { status: "AWAITING_INPUT" as AgentStatus, output: fullOutput },
          });
          await db.agentMessage
            .create({ data: { runId: agentRun.id, role: "AGENT", content: fullOutput } })
            .catch(err => console.error("AgentMessage write failed:", err));
          void logAudit(0, "AWAITING_INPUT", null,
            `Agent paused for user input. ${questions.length} question(s) identified.`);
          send({
            t:         "await_input",
            runId:     agentRun.id,
            question:  "Please answer the open questions so the agent can continue.",
            questions,
            round:     1,
          });
        } else {
          await db.agentRun.update({
            where: { id: agentRun.id },
            data:  { status: "COMPLETED" as AgentStatus, output: fullOutput, completedAt: new Date() },
          });
          send({ t: "done", runId: agentRun.id });
        }

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        emitStep("error", msg);
        await db.agentRun.update({
          where: { id: agentRun.id },
          data:  { status: "FAILED" as AgentStatus, error: msg, completedAt: new Date() },
        });
        send({ t: "err", message: msg });
      } finally {
        controller.close();
        await mcpClient?.close().catch(err => console.error("MCP close failed:", err));
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":   "text/plain; charset=utf-8",
      "X-Agent-Run-Id": agentRun.id,
      "Cache-Control":  "no-cache",
    },
  });
}

// Prerequisite check endpoint (GET)
export async function GET(req: NextRequest, { params }: Params) {
  try { await requireAuth(); } catch {
    return new Response("Unauthorized", { status: 401 });
  }
  const { agentName } = await params;
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return Response.json({ error: "projectId required" }, { status: 400 });

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { documents: { select: { type: true, ocrText: true, name: true } } },
  });
  if (!project) return Response.json({ error: "not found" }, { status: 404 });

  return Response.json(checkPrerequisites(agentName, project.documents));
}
