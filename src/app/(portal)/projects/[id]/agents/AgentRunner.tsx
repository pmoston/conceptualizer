"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, AlertTriangle,
  ChevronDown, ChevronRight, Info, Bot, Wrench, TriangleAlert, CircleX,
  MessageSquare, Send, HelpCircle, RotateCcw,
} from "lucide-react";
import Link from "next/link";
import type { StreamEvent, StepKind } from "@/lib/agentStream";
import { buildAnswerPayload } from "@/lib/agentQuestions";
import { checkPrerequisites, type PrereqDoc } from "@/lib/agentPrerequisites";

interface Project {
  id: string;
  title: string;
  language: string;
}

// ─── Agent metadata ────────────────────────────────────────────────────────────

const AGENTS = [
  { name: "read-materials",          label: "Read Materials",          description: "Analyse source documents → structured brief of facts, needs, constraints, open questions." },
  { name: "draft",                   label: "Draft Concept",           description: "Write concept document. Runs a draft → fact-check feedback loop (up to 3 iterations)." },
  { name: "fact-check",              label: "Fact-Check",              description: "Compare latest draft against source materials, flag unsupported claims and contradictions." },
  { name: "humanize",                label: "Humanize",                description: "Rewrite draft to read naturally; remove AI-typical patterns while keeping professional tone." },
  { name: "corporate-design-review", label: "Corporate Design Review", description: "Check brand guidelines (tone, naming, structure, language). Runs full revision loop until approved." },
  { name: "translate",               label: "Translate",               description: "Translate latest draft to the other project language (DE ↔ EN)." },
  { name: "executive-summary",       label: "Executive Summary",       description: "One-page summary: situation, approach, deliverables, outcome, next steps." },
  { name: "qa-checklist",            label: "QA Checklist",            description: "Pre-delivery checklist: content accuracy, structure, language, client specifics, formal requirements." },
] as const;

// Main pipeline: recommended execution order
const PIPELINE_NODES: Array<{
  name: AgentName;
  step: number;
  label: string;
  badge?: string;     // short loop/behaviour label shown inside the node
  badgeKind?: "qa" | "loop";
}> = [
  { name: "read-materials",          step: 1, label: "Read Materials",    badge: "Q&A dialogue",   badgeKind: "qa" },
  { name: "draft",                   step: 2, label: "Draft",             badge: "↻ Fact-Check",   badgeKind: "loop" },
  { name: "humanize",                step: 3, label: "Humanize" },
  { name: "corporate-design-review", step: 4, label: "CDR Review",        badge: "↻ 3-step loop",  badgeKind: "loop" },
  { name: "executive-summary",       step: 5, label: "Exec. Summary" },
  { name: "qa-checklist",            step: 6, label: "QA Checklist" },
];

// Agents that are used standalone / on demand
const STANDALONE_NODES: Array<{ name: AgentName; label: string; note: string }> = [
  { name: "fact-check", label: "Fact-Check", note: "Verify any draft on demand" },
  { name: "translate",  label: "Translate",  note: "DE ↔ EN at any stage" },
];

type AgentName = (typeof AGENTS)[number]["name"];
type RunStatus = "idle" | "running" | "done" | "error" | "awaiting";

interface StepEntry {
  kind: StepKind;
  label: string;
  content: string;
  done: boolean;
}

interface DialogueTurn {
  role: "agent" | "user";
  content: string;   // agent: the questions text block; user: the answers
  round: number;
}

const stepIcon: Record<StepKind, React.ReactNode> = {
  info:         <Info size={13} className="text-gray-400 shrink-0 mt-0.5" />,
  agent_call:   <Bot size={13} className="text-[#1c1e3b] shrink-0 mt-0.5" />,
  agent_output: <CheckCircle2 size={13} className="text-green-500 shrink-0 mt-0.5" />,
  tool_call:    <Wrench size={13} className="text-blue-400 shrink-0 mt-0.5" />,
  tool_result:  <Wrench size={13} className="text-blue-600 shrink-0 mt-0.5" />,
  warning:      <TriangleAlert size={13} className="text-orange-400 shrink-0 mt-0.5" />,
  error:        <CircleX size={13} className="text-red-500 shrink-0 mt-0.5" />,
};

function StepItem({ step, isLast }: { step: StepEntry; isLast: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const hasContent = step.content.length > 0;
  const isAgentStep = step.kind === "agent_call" || step.kind === "agent_output";

  return (
    <div className="border-l-2 border-gray-100 pl-3 py-1">
      <div
        className={`flex items-start gap-2 ${hasContent && isAgentStep ? "cursor-pointer" : ""}`}
        onClick={() => hasContent && isAgentStep && setExpanded(v => !v)}
      >
        {stepIcon[step.kind]}
        <span className="text-xs text-gray-600 flex-1">{step.label}</span>
        {isLast && !step.done && (
          <Loader2 size={11} className="animate-spin text-gray-300 shrink-0 mt-0.5" />
        )}
        {hasContent && isAgentStep && (
          expanded
            ? <ChevronDown size={11} className="text-gray-300 shrink-0 mt-0.5" />
            : <ChevronRight size={11} className="text-gray-300 shrink-0 mt-0.5" />
        )}
      </div>
      {hasContent && expanded && isAgentStep && (
        <pre className="mt-1 ml-5 text-xs text-gray-500 font-sans whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto bg-gray-50 rounded p-2">
          {step.content}
          {isLast && !step.done && <span className="animate-pulse">▊</span>}
        </pre>
      )}
    </div>
  );
}

export default function AgentRunner({
  project,
  documents,
  defaultAgent,
}: {
  project: Project;
  documents: PrereqDoc[];
  defaultAgent?: string;
}) {
  const router = useRouter();
  const [selectedAgent, setSelectedAgent] = useState<AgentName>(
    (defaultAgent as AgentName) ?? "read-materials",
  );
  const [instructions, setInstructions]     = useState("");
  const [steps, setSteps]                   = useState<StepEntry[]>([]);
  const [status, setStatus]                 = useState<RunStatus>("idle");
  const [errorMsg, setErrorMsg]             = useState<string | null>(null);
  const [runId, setRunId]                   = useState<string | null>(null);

  // Dialogue state
  const [awaitQuestions, setAwaitQuestions] = useState<string[]>([]);
  const [answers, setAnswers]               = useState<string[]>([]);
  const [dialogueRound, setDialogueRound]   = useState(1);
  const [dialogueHistory, setDialogueHistory] = useState<DialogueTurn[]>([]);
  const [replySending, setReplySending]     = useState(false);

  const stepsEndRef   = useRef<HTMLDivElement>(null);
  const qaTopRef      = useRef<HTMLDivElement>(null);

  const prereq = checkPrerequisites(selectedAgent, documents);

  useEffect(() => {
    stepsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [steps.length]);

  // Scroll Q&A panel into view when awaiting input
  useEffect(() => {
    if (status === "awaiting") {
      setTimeout(() => qaTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [status]);

  async function processStream(res: Response) {
    if (!res.body) throw new Error("No response body");

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer    = "";
    let receivedTerminal = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line) as StreamEvent;

          if (event.t === "step") {
            setSteps(prev => {
              const closed = prev.map((s, i) =>
                i === prev.length - 1 ? { ...s, done: true } : s,
              );
              return [...closed, { kind: event.kind, label: event.label, content: event.content ?? "", done: false }];
            });
          } else if (event.t === "delta") {
            setSteps(prev => {
              if (prev.length === 0) return prev;
              const last = { ...prev[prev.length - 1], content: prev[prev.length - 1].content + event.text };
              return [...prev.slice(0, -1), last];
            });
          } else if (event.t === "done") {
            receivedTerminal = true;
            setSteps(prev => prev.map((s, i) => i === prev.length - 1 ? { ...s, done: true } : s));
            setRunId(event.runId);
            setStatus("done");
            router.refresh();
          } else if (event.t === "await_input") {
            receivedTerminal = true;
            setSteps(prev => prev.map((s, i) => i === prev.length - 1 ? { ...s, done: true } : s));
            setRunId(event.runId);
            setAwaitQuestions(event.questions);
            setAnswers(event.questions.map(() => ""));
            setDialogueRound(event.round);
            setStatus("awaiting");
          } else if (event.t === "err") {
            receivedTerminal = true;
            setErrorMsg(event.message);
            setStatus("error");
          }
        } catch { /* skip malformed lines */ }
      }
    }

    if (!receivedTerminal) {
      setSteps(prev => prev.map((s, i) => i === prev.length - 1 ? { ...s, done: true } : s));
      setErrorMsg("Connection lost mid-run. The run may have completed on the server — check the run history.");
      setStatus("error");
    }
  }

  async function handleRun() {
    setStatus("running");
    setSteps([]);
    setErrorMsg(null);
    setRunId(null);
    setAwaitQuestions([]);
    setAnswers([]);
    setDialogueRound(1);
    setDialogueHistory([]);
    setReplyText("");

    try {
      const res = await fetch(`/api/agents/${selectedAgent}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ projectId: project.id, instructions: instructions.trim() || undefined }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { missing?: string[]; error?: string };
        if (data.missing) {
          setErrorMsg(`Prerequisites not met:\n• ${data.missing.join("\n• ")}`);
        } else {
          setErrorMsg(data.error ?? `HTTP ${res.status}`);
        }
        setStatus("error");
        return;
      }

      await processStream(res);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Unknown error");
      setStatus("error");
    }
  }

  async function handleReply() {
    if (!runId || answers.every(a => !a.trim()) && awaitQuestions.length > 0) return;

    const payload = buildAnswerPayload(awaitQuestions, answers);

    // Record user's answers in local history
    setDialogueHistory(prev => [
      ...prev,
      { role: "user", content: payload, round: dialogueRound },
    ]);

    setReplySending(true);
    setStatus("running");
    setSteps(prev => prev.map(s => ({ ...s, done: true })));

    try {
      const res = await fetch(`/api/agents/runs/${runId}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ message: payload, round: dialogueRound }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setErrorMsg(data.error ?? `HTTP ${res.status}`);
        setStatus("error");
        return;
      }

      setAnswers([]);
      setAwaitQuestions([]);
      await processStream(res);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Unknown error");
      setStatus("error");
    } finally {
      setReplySending(false);
    }
  }

  const [replyText, setReplyText] = useState(""); // fallback single textarea when no parsed questions

  const agent    = AGENTS.find(a => a.name === selectedAgent) ?? AGENTS[0];
  const isRunning = status === "running" || replySending;
  const canSubmitReply = awaitQuestions.length > 0
    ? answers.some(a => a.trim())  // at least one answer
    : replyText.trim().length > 0;

  return (
    <div className="max-w-4xl">
      <Link href={`/projects/${project.id}`} className="flex items-center gap-1 text-sm text-gray-400 hover:text-[#1c1e3b] mb-6">
        <ArrowLeft size={14} /> Back to project
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1c1e3b]">Run Agent</h1>
        <p className="text-sm text-gray-500 mt-1">{project.title}</p>
      </div>

      <div className="grid grid-cols-1 gap-5">
        {/* ── Workflow diagram ──────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-[#1c1e3b] mb-1">Agent Workflow</h2>
          <p className="text-xs text-gray-400 mb-4">Click any step to select it. Arrows show the recommended sequence.</p>

          {/* Main pipeline */}
          <div className="overflow-x-auto pb-1">
            <div className="flex items-start gap-0 min-w-max">
              {PIPELINE_NODES.map((node, i) => {
                const isSelected = selectedAgent === node.name;
                return (
                  <div key={node.name} className="flex items-start">
                    {/* Node */}
                    <button
                      onClick={() => setSelectedAgent(node.name)}
                      disabled={isRunning || status === "awaiting"}
                      className={`flex flex-col items-center gap-1 px-3 pt-2 pb-2.5 rounded-xl border-2 transition w-[108px] shrink-0 ${
                        isSelected
                          ? "border-[#b3cc26] bg-[#f8fbea]"
                          : "border-gray-100 hover:border-gray-200 bg-white"
                      } disabled:opacity-50`}
                    >
                      {/* Step number */}
                      <span className={`text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center ${
                        isSelected ? "bg-[#b3cc26] text-white" : "bg-gray-100 text-gray-400"
                      }`}>
                        {node.step}
                      </span>
                      {/* Label */}
                      <span className={`text-xs font-semibold text-center leading-tight ${
                        isSelected ? "text-[#1c1e3b]" : "text-gray-700"
                      }`}>
                        {node.label}
                      </span>
                      {/* Loop/behaviour badge */}
                      {node.badge && (
                        <span className={`inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                          node.badgeKind === "qa"
                            ? "bg-blue-50 text-blue-500"
                            : "bg-orange-50 text-orange-500"
                        }`}>
                          {node.badgeKind === "qa"
                            ? <MessageSquare size={8} />
                            : <RotateCcw size={8} />
                          }
                          {node.badge}
                        </span>
                      )}
                    </button>

                    {/* Arrow connector */}
                    {i < PIPELINE_NODES.length - 1 && (
                      <div className="flex items-center self-start mt-4 shrink-0">
                        <div className="w-3 h-px bg-gray-200" />
                        <ChevronRight size={12} className="text-gray-300 -ml-0.5" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* CDR revision sub-loop annotation */}
          <div className="mt-3 ml-0">
            {/* The bracket connects from Draft (step 2) through to CDR (step 4) */}
            <div className="flex items-stretch gap-0 min-w-max overflow-x-auto">
              {/* left spacer: align with start of Draft node (step 2) = 1 node + 1 arrow width */}
              <div className="shrink-0" style={{ width: "120px" }} />
              {/* The loop box itself spans Draft→Humanize→CDR */}
              <div className="border border-dashed border-orange-200 rounded-lg px-3 py-2 bg-orange-50/40 flex items-center gap-1.5 shrink-0">
                <RotateCcw size={11} className="text-orange-400 shrink-0" />
                <span className="text-[10px] text-orange-500 font-medium whitespace-nowrap">
                  When CDR finds issues:
                </span>
                {(["Draft revision", "Fact-Check", "Humanize"] as const).map((step, i, arr) => (
                  <div key={step} className="flex items-center gap-1">
                    <span className="text-[10px] text-orange-600 bg-white border border-orange-200 rounded px-1.5 py-0.5 font-medium whitespace-nowrap">
                      {step}
                    </span>
                    {i < arr.length - 1 && (
                      <ChevronRight size={10} className="text-orange-300 shrink-0" />
                    )}
                  </div>
                ))}
                <ChevronRight size={10} className="text-orange-300 shrink-0" />
                <span className="text-[10px] text-orange-600 bg-white border border-orange-200 rounded px-1.5 py-0.5 font-medium whitespace-nowrap">
                  CDR Review
                </span>
                <span className="text-[10px] text-orange-400 ml-1 whitespace-nowrap">(max 3×)</span>
              </div>
            </div>
          </div>

          {/* Standalone / optional agents */}
          <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-3 flex-wrap">
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide shrink-0">
              Optional / standalone
            </span>
            {STANDALONE_NODES.map(node => {
              const isSelected = selectedAgent === node.name;
              return (
                <button
                  key={node.name}
                  onClick={() => setSelectedAgent(node.name)}
                  disabled={isRunning || status === "awaiting"}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition ${
                    isSelected
                      ? "border-[#b3cc26] bg-[#f8fbea]"
                      : "border-gray-100 hover:border-gray-200 bg-white"
                  } disabled:opacity-50`}
                >
                  <span className={`text-xs font-semibold ${isSelected ? "text-[#1c1e3b]" : "text-gray-700"}`}>
                    {node.label}
                  </span>
                  <span className="text-[10px] text-gray-400">{node.note}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Prerequisites warning */}
        {!prereq.ok && status === "idle" && (
          <div className="flex items-start gap-2 bg-orange-50 border border-orange-100 rounded-xl p-4">
            <AlertTriangle size={15} className="text-orange-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-orange-700">Prerequisites not met for {agent.label}</p>
              <ul className="mt-1 space-y-0.5">
                {prereq.missing.map((m, i) => (
                  <li key={i} className="text-xs text-orange-600">• {m}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Instructions + Run — hidden while awaiting */}
        {status !== "awaiting" && (
          <section className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-[#1c1e3b] mb-1">{agent.label}</h2>
            <p className="text-xs text-gray-400 mb-3">{agent.description}</p>

            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              disabled={isRunning}
              placeholder="Optional: additional instructions or focus areas for this run…"
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#b3cc26] resize-y disabled:opacity-50"
            />

            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={handleRun}
                disabled={isRunning || !prereq.ok}
                className="flex items-center gap-2 bg-[#1c1e3b] text-white font-semibold text-sm px-4 py-2 rounded-lg hover:bg-[#2a2d52] disabled:opacity-50 transition"
              >
                {isRunning && <Loader2 size={14} className="animate-spin" />}
                {isRunning ? "Running…" : "Run Agent"}
              </button>

              {status === "done" && runId && (
                <Link
                  href={`/projects/${project.id}/agents/runs/${runId}`}
                  className="flex items-center gap-1.5 text-sm text-green-600 hover:underline"
                >
                  <CheckCircle2 size={14} /> Completed — view run log
                </Link>
              )}
              {status === "error" && (
                <span className="flex items-center gap-1.5 text-sm text-red-500">
                  <XCircle size={14} /> Failed
                </span>
              )}
            </div>

            {status === "error" && errorMsg && (
              <pre className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg p-3 whitespace-pre-wrap">{errorMsg}</pre>
            )}
          </section>
        )}

        {/* Processing log */}
        {steps.length > 0 && (
          <section className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-[#1c1e3b] mb-3">
              Processing Log
              {isRunning && (
                <span className="ml-2 text-xs font-normal text-gray-400 inline-flex items-center gap-1">
                  <Loader2 size={11} className="animate-spin" /> running
                </span>
              )}
            </h2>
            <div className="space-y-1">
              {steps.map((step, i) => (
                <StepItem key={i} step={step} isLast={i === steps.length - 1} />
              ))}
            </div>
            <div ref={stepsEndRef} />
          </section>
        )}

        {/* Q&A panel — shown when agent is awaiting user input */}
        {status === "awaiting" && runId && (
          <section ref={qaTopRef} className="bg-white rounded-xl border-2 border-[#b3cc26] p-5">
            {/* Header */}
            <div className="flex items-start gap-2 mb-5">
              <MessageSquare size={16} className="text-[#b3cc26] shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-[#1c1e3b]">Agent Questions — Round {dialogueRound}</h2>
                  {dialogueRound > 1 && (
                    <span className="text-xs bg-orange-50 text-orange-600 border border-orange-200 rounded-full px-2 py-0.5">
                      Previous answers were incomplete
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  The agent needs clarification before it can proceed. Please answer each question below.
                </p>
              </div>
            </div>

            {/* Prior dialogue history (collapsed per round) */}
            {dialogueHistory.length > 0 && (
              <div className="mb-5 space-y-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Dialogue history</p>
                {dialogueHistory.map((turn, i) => (
                  <div key={i} className={`rounded-lg border p-3 ${
                    turn.role === "user"
                      ? "bg-[#f8fbea] border-[#b3cc26]/30 ml-6"
                      : "bg-gray-50 border-gray-100"
                  }`}>
                    <p className="text-xs font-medium text-gray-400 mb-1">
                      {turn.role === "user" ? `Your answers (round ${turn.round})` : `Agent (round ${turn.round})`}
                    </p>
                    <pre className="text-xs text-gray-600 font-sans whitespace-pre-wrap leading-relaxed">
                      {turn.content}
                    </pre>
                  </div>
                ))}
              </div>
            )}

            {/* Per-question inputs */}
            {awaitQuestions.length > 0 ? (
              <div className="space-y-4">
                {awaitQuestions.map((q, i) => (
                  <div key={i} className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <HelpCircle size={13} className="text-[#b3cc26] shrink-0 mt-0.5" />
                      <p className="text-sm font-medium text-[#1c1e3b]">{i + 1}. {q}</p>
                    </div>
                    <textarea
                      value={answers[i] ?? ""}
                      onChange={e => {
                        const next = [...answers];
                        next[i] = e.target.value;
                        setAnswers(next);
                      }}
                      disabled={replySending}
                      placeholder="Your answer…"
                      rows={2}
                      className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#b3cc26] resize-y disabled:opacity-50"
                    />
                  </div>
                ))}
              </div>
            ) : (
              /* Fallback: no structured questions — show free text */
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                disabled={replySending}
                placeholder="Type your answers to the open questions here…"
                rows={6}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#b3cc26] resize-y disabled:opacity-50"
              />
            )}

            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleReply}
                disabled={replySending || !canSubmitReply}
                className="flex items-center gap-2 bg-[#1c1e3b] text-white font-semibold text-sm px-4 py-2 rounded-lg hover:bg-[#2a2d52] disabled:opacity-50 transition"
              >
                {replySending
                  ? <><Loader2 size={14} className="animate-spin" /> Sending…</>
                  : <><Send size={14} /> Submit Answers</>
                }
              </button>
              <span className="text-xs text-gray-400">
                The agent will evaluate your answers and continue — or ask again if more detail is needed.
              </span>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
