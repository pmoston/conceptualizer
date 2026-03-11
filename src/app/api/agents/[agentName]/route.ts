import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AgentModels } from "@/lib/models";
import { checkPrerequisites } from "@/lib/agentPrerequisites";
import { encode, type StepKind } from "@/lib/agentStream";
import type { AgentInput } from "@/agents/types";
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
import type { StepType } from "@prisma/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const agentRegistry: Record<string, (input: AgentInput) => ReturnType<typeof runDraftAgent>> = {
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

type Params = { params: Promise<{ agentName: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try { await requireAuth(); } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const { agentName } = await params;
  if (!agentRegistry[agentName]) {
    return new Response(`Unknown agent: ${agentName}`, { status: 404 });
  }

  const body = await req.json() as { projectId: string; instructions?: string };
  const { projectId, instructions } = body;
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

  // Build context from documents
  const sourceDocs = project.documents.filter(d => d.type === "SOURCE_MATERIAL");
  const draftDocs  = project.documents.filter(d => d.type === "DRAFT" || d.type === "FINAL");

  const sourceMaterials =
    sourceDocs.length > 0
      ? sourceDocs.map(d => `[${d.name}]\n${d.ocrText ?? "(no extracted text)"}`).join("\n\n---\n\n")
      : "No source materials available.";

  const currentDraft =
    draftDocs.length > 0
      ? `[${draftDocs[0].name}]\n${draftDocs[0].ocrText ?? "(no extracted text)"}`
      : null;

  const baseInput: AgentInput = {
    projectTitle:  project.title,
    language:      project.language,
    description:   project.description,
    sourceMaterials,
    currentDraft,
    instructions:  instructions ?? null,
  };

  // Create run record
  const agentRun = await db.agentRun.create({
    data: {
      agentName,
      status:    "RUNNING",
      input:     { projectId, instructions: instructions ?? null },
      projectId,
    },
  });

  // Set up MCP client for fact-check (optional, falls back gracefully)
  let mcpTools: Record<string, Tool> = {};
  let mcpClient: Awaited<ReturnType<typeof createMCPClient>> | null = null;
  const mcpUrl = process.env.MSDOCS_MCP_URL;
  if (mcpUrl && (agentName === "fact-check" || agentName === "draft" || agentName === "corporate-design-review")) {
    try {
      mcpClient = await createMCPClient({ transport: { type: "sse", url: mcpUrl } });
      mcpTools = await mcpClient.tools();
    } catch {
      // MCP unavailable — continue without it
      mcpClient = null;
      mcpTools = {};
    }
  }

  let stepIndex = 0;

  // Build a readable stream that drives all orchestration
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Parameters<typeof encode>[0]) =>
        controller.enqueue(encode(data));

      // Save step to DB non-blocking, also emit to stream
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
          .catch(() => {});
        send({ t: "step", kind, label, content });
      }

      // Run a single agent, streaming deltas to client, returns full text
      async function streamAgent(
        name: string,
        input: AgentInput,
      ): Promise<string> {
        const hasMcp = name === "fact-check" && Object.keys(mcpTools).length > 0;
        emitStep(
          "agent_call",
          `Calling ${agentLabels[name] ?? name}…${hasMcp ? " (with Microsoft Learn docs)" : ""}`,
        );
        if (hasMcp) {
          emitStep("tool_call", "Loading Microsoft Learn documentation tools…");
        }
        const result =
          name === "fact-check"
            ? runFactCheckAgent(input, hasMcp ? mcpTools : undefined)
            : agentRegistry[name](input);
        let text = "";
        for await (const chunk of result.textStream) {
          text += chunk;
          send({ t: "delta", text: chunk });
        }
        emitStep("agent_output", `${agentLabels[name] ?? name} complete`, text);
        return text;
      }

      // Heuristic: fact-check passes if no significant issues mentioned
      function factCheckPasses(fcText: string): boolean {
        const t = fcText.toLowerCase();
        const issueTerms = [
          "contradiction",
          "inaccurac",
          "unsupported claim",
          "factual error",
          "incorrect",
          "no basis",
        ];
        return !issueTerms.some(term => t.includes(term));
      }

      let fullOutput = "";

      try {
        emitStep("info", "Prerequisites verified. Starting agent run…");

        if (agentName === "draft") {
          // --- Draft + Fact-Check feedback loop ---
          const MAX = 3;
          let factCheckFeedback = "";
          let passed = false;

          for (let i = 1; i <= MAX && !passed; i++) {
            const draftInput: AgentInput = {
              ...baseInput,
              instructions: [
                baseInput.instructions,
                factCheckFeedback
                  ? `Apply the following fact-check corrections before writing:\n${factCheckFeedback}`
                  : "",
              ]
                .filter(Boolean)
                .join("\n\n"),
            };

            emitStep("info", `Draft–FactCheck loop: iteration ${i}/${MAX}`);
            const draftText = await streamAgent("draft", draftInput);
            fullOutput = draftText;

            emitStep("info", "Verifying draft with fact-check agent…");
            const fcInput: AgentInput = { ...baseInput, currentDraft: draftText };
            factCheckFeedback = await streamAgent("fact-check", fcInput);

            passed = factCheckPasses(factCheckFeedback);

            if (passed) {
              emitStep("info", `✓ Fact-check passed after ${i} iteration(s). Draft is complete.`);
            } else if (i < MAX) {
              emitStep("warning", `Issues found. Revising draft (iteration ${i + 1}/${MAX})…`);
            } else {
              emitStep("warning", `Maximum iterations (${MAX}) reached. Using latest draft.`);
            }
          }
        } else if (agentName === "corporate-design-review") {
          // --- CDR followed by fact-check verification ---
          fullOutput = await streamAgent("corporate-design-review", baseInput);

          emitStep("info", "Running fact-check to verify reviewed content…");
          const fcInput: AgentInput = { ...baseInput, currentDraft: fullOutput };
          const fcResult = await streamAgent("fact-check", fcInput);

          // Append fact-check result to output
          fullOutput = `## Corporate Design Review\n\n${fullOutput}\n\n---\n\n## Fact-Check Verification\n\n${fcResult}`;
        } else {
          // --- Single agent run ---
          fullOutput = await streamAgent(agentName, baseInput);
        }

        await db.agentRun.update({
          where: { id: agentRun.id },
          data:  { status: "COMPLETED", output: fullOutput, completedAt: new Date() },
        });

        send({ t: "done", runId: agentRun.id });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        emitStep("error", msg);
        await db.agentRun.update({
          where: { id: agentRun.id },
          data:  { status: "FAILED", error: msg, completedAt: new Date() },
        });
        send({ t: "err", message: msg });
      } finally {
        controller.close();
        await mcpClient?.close().catch(() => {});
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":    "text/plain; charset=utf-8",
      "X-Agent-Run-Id":  agentRun.id,
      "Cache-Control":   "no-cache",
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
