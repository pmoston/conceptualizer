import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encode } from "@/lib/agentStream";
import { parseQuestions } from "@/lib/agentQuestions";
import { runReadMaterialsAgent } from "@/agents/read-materials";
import { runDraftAgent } from "@/agents/draft";
import type { AgentInput } from "@/agents/types";
import type { AgentStatus } from "@prisma/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dialogueAgentRegistry: Record<string, (input: AgentInput) => any> = {
  "read-materials": runReadMaterialsAgent,
  "draft":          runDraftAgent,
};

const agentLabels: Record<string, string> = {
  "read-materials": "Read Materials",
  "draft":          "Draft Concept",
};

const MAX_SOURCE_CHARS = 80_000;
const MAX_DRAFT_CHARS  = 40_000;
const MAX_REPLY_CHARS  = 6_000;

function truncate(text: string, max: number, label: string): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n[${label} truncated at ${max} characters — ${text.length - max} chars omitted]`;
}

function hasOpenQuestions(text: string): boolean {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 5); i--) {
    const line = lines[i].toUpperCase();
    if (line.includes("QUESTIONS_FOLLOW: YES")) return true;
    if (line.includes("QUESTIONS_FOLLOW: NO"))  return false;
  }
  return false;
}

type Params = { params: Promise<{ runId: string }> };

// GET — return run status and message history
export async function GET(_req: NextRequest, { params }: Params) {
  try { await requireAuth(); } catch {
    return new Response("Unauthorized", { status: 401 });
  }
  const { runId } = await params;

  const run = await db.agentRun.findUnique({
    where:   { id: runId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!run) return Response.json({ error: "not found" }, { status: 404 });

  return Response.json({ status: run.status, messages: run.messages });
}

// POST — accept user reply to AWAITING_INPUT run
export async function POST(req: NextRequest, { params }: Params) {
  try { await requireAuth(); } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const { runId } = await params;

  let body: { message?: unknown; round?: unknown };
  try {
    body = await req.json() as typeof body;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const message   = typeof body.message === "string" ? body.message.trim() : null;
  const clientRound = typeof body.round === "number" ? body.round : 1;
  if (!message) return new Response("message required", { status: 400 });

  const run = await db.agentRun.findUnique({
    where:   { id: runId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!run)                            return new Response("Run not found", { status: 404 });
  if (run.status !== "AWAITING_INPUT") return new Response("Run is not awaiting input", { status: 409 });

  const agentRunner = dialogueAgentRegistry[run.agentName];
  if (!agentRunner) {
    return new Response(`Dialogue not supported for agent: ${run.agentName}`, { status: 422 });
  }

  // Load the project
  const project = await db.project.findUnique({
    where:   { id: run.projectId },
    include: { documents: { orderBy: { createdAt: "desc" } } },
  });
  if (!project) return new Response("Project not found", { status: 404 });

  // Save user message
  await db.agentMessage
    .create({ data: { runId, role: "USER", content: message } })
    .catch(err => console.error("AgentMessage (user) write failed:", err));

  // Mark run as running
  await db.agentRun.update({
    where: { id: runId },
    data:  { status: "RUNNING" as AgentStatus },
  });

  // Build source context
  const sourceDocs = project.documents.filter(d => d.type === "SOURCE_MATERIAL");
  const draftDocs  = project.documents.filter(d => d.type === "DRAFT" || d.type === "FINAL");
  const rawSourceMaterials = sourceDocs.length > 0
    ? sourceDocs.map(d => `[${d.name}]\n${d.ocrText ?? "(no extracted text)"}`).join("\n\n---\n\n")
    : "No source materials available.";

  const sourceMaterials = truncate(rawSourceMaterials, MAX_SOURCE_CHARS, "source materials");
  const latestDraft     = draftDocs.length > 0
    ? truncate(`[${draftDocs[0].name}]\n${draftDocs[0].ocrText ?? "(no extracted text)"}`, MAX_DRAFT_CHARS, "draft")
    : null;

  // Build full dialogue history for context
  const previousOutput = truncate(run.output ?? "", MAX_DRAFT_CHARS, "previous output");
  const safeMessage    = truncate(message, MAX_REPLY_CHARS, "reply");

  // Build prior Q&A turns from message history (excluding current user reply which we just saved)
  const priorMessages = run.messages.filter(m => m.role === "USER");
  const priorQaContext = priorMessages.length > 1
    ? `Previous dialogue rounds:\n` +
      priorMessages.slice(0, -1).map((m, i) => `Round ${i + 1} answers:\n${m.content}`).join("\n\n") + "\n\n"
    : "";

  // Extract questions from previous agent output so we can evaluate sufficiency
  const previousQuestions = parseQuestions(previousOutput);
  const questionsContext = previousQuestions.length > 0
    ? `Questions asked in the previous round:\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}\n\n`
    : "";

  const nextRound = clientRound + 1;

  const continuationInstructions =
    `CONTINUATION — Round ${clientRound} user reply (agent: ${agentLabels[run.agentName] ?? run.agentName}).\n\n` +
    `${priorQaContext}` +
    `Previous agent output:\n${previousOutput}\n\n` +
    `${questionsContext}` +
    `User's answers (round ${clientRound}):\n${safeMessage}\n\n` +
    `Instructions:\n` +
    `1. For each question listed above, evaluate whether the user's answer provides sufficient information to proceed.\n` +
    `2. If an answer is sufficient: incorporate it into the updated output.\n` +
    `3. If an answer is insufficient, vague, or missing: re-ask that specific question with clearer guidance on what is needed.\n` +
    `4. Only write QUESTIONS_FOLLOW: NO when every question is adequately answered.\n` +
    `5. If any questions remain, list them again in the "## Open Questions for Clarification" section with QUESTIONS_FOLLOW: YES.\n\n` +
    `Produce a complete updated output incorporating all confirmed answers. Round ${nextRound} will follow if questions remain.`;

  const continuationInput: AgentInput = {
    projectTitle:   project.title || "(Untitled project)",
    language:       project.language,
    description:    project.description ? truncate(project.description, 1_000, "description") : null,
    sourceMaterials,
    currentDraft:   latestDraft,
    instructions:   continuationInstructions,
  };

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Parameters<typeof encode>[0]) =>
        controller.enqueue(encode(data));

      try {
        send({
          t:     "step",
          kind:  "info",
          label: `Round ${clientRound} answer received — evaluating sufficiency and updating output…`,
        });

        const result = agentRunner(continuationInput);
        let text = "";

        send({ t: "step", kind: "agent_call", label: `${agentLabels[run.agentName] ?? run.agentName} — updating…` });

        try {
          for await (const chunk of result.textStream) {
            text += chunk;
            send({ t: "delta", text: chunk });
          }
        } catch (streamErr: unknown) {
          const msg = streamErr instanceof Error ? streamErr.message : String(streamErr);
          send({ t: "step", kind: "error", label: `Stream error: ${msg}` });
          throw streamErr;
        }

        send({ t: "step", kind: "agent_output", label: "Updated output complete", content: text });

        // Save agent response
        await db.agentMessage
          .create({ data: { runId, role: "AGENT", content: text } })
          .catch(err => console.error("AgentMessage (agent) write failed:", err));

        if (hasOpenQuestions(text)) {
          const questions = parseQuestions(text);
          const insufficient = questions.length > 0
            ? questions.filter((_, i) => i < previousQuestions.length)
            : questions;

          await db.agentRun.update({
            where: { id: runId },
            data:  { status: "AWAITING_INPUT" as AgentStatus, output: text },
          });

          if (insufficient.length > 0) {
            send({ t: "step", kind: "warning", label: `${insufficient.length} question(s) not yet sufficiently answered — asking again (round ${nextRound})` });
          }

          send({
            t:         "await_input",
            runId,
            question:  `Some questions were not fully answered. Please review round ${nextRound} questions below.`,
            questions,
            round:     nextRound,
          });
        } else {
          await db.agentRun.update({
            where: { id: runId },
            data:  { status: "COMPLETED" as AgentStatus, output: text, completedAt: new Date() },
          });
          send({ t: "step", kind: "info", label: "All questions answered — run complete." });
          send({ t: "done", runId });
        }

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        await db.agentRun.update({
          where: { id: runId },
          data:  { status: "FAILED" as AgentStatus, error: msg, completedAt: new Date() },
        }).catch(() => {});
        send({ t: "err", message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
