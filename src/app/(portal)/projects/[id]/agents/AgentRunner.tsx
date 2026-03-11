"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, AlertTriangle,
  ChevronDown, ChevronRight, Info, Bot, Wrench, TriangleAlert, CircleX,
} from "lucide-react";
import Link from "next/link";
import type { StreamEvent, StepKind } from "@/lib/agentStream";
import { checkPrerequisites, type PrereqDoc } from "@/lib/agentPrerequisites";

interface Project {
  id: string;
  title: string;
  language: string;
}

const AGENTS = [
  { name: "read-materials",          label: "Read Materials",          description: "Analyse source documents → structured brief of facts, needs, constraints, open questions." },
  { name: "draft",                   label: "Draft Concept",           description: "Write concept document. Runs a draft → fact-check feedback loop (up to 3 iterations)." },
  { name: "fact-check",              label: "Fact-Check",              description: "Compare latest draft against source materials, flag unsupported claims and contradictions." },
  { name: "humanize",                label: "Humanize",                description: "Rewrite draft to read naturally; remove AI-typical patterns while keeping professional tone." },
  { name: "corporate-design-review", label: "Corporate Design Review", description: "Check brand guidelines (tone, naming, structure, language). Automatically runs fact-check after." },
  { name: "translate",               label: "Translate",               description: "Translate latest draft to the other project language (DE ↔ EN)." },
  { name: "executive-summary",       label: "Executive Summary",       description: "One-page summary: situation, approach, deliverables, outcome, next steps." },
  { name: "qa-checklist",            label: "QA Checklist",            description: "Pre-delivery checklist: content accuracy, structure, language, client specifics, formal requirements." },
] as const;

type AgentName = (typeof AGENTS)[number]["name"];
type RunStatus = "idle" | "running" | "done" | "error";

interface StepEntry {
  kind: StepKind;
  label: string;
  content: string;  // accumulated text for this step
  done: boolean;
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
  const [instructions, setInstructions] = useState("");
  const [steps, setSteps] = useState<StepEntry[]>([]);
  const [status, setStatus] = useState<RunStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const stepsEndRef = useRef<HTMLDivElement>(null);

  const prereq = checkPrerequisites(selectedAgent, documents);

  useEffect(() => {
    stepsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [steps.length]);

  async function handleRun() {
    setStatus("running");
    setSteps([]);
    setErrorMsg(null);
    setRunId(null);

    try {
      const res = await fetch(`/api/agents/${selectedAgent}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ projectId: project.id, instructions: instructions || undefined }),
      });

      // Handle prerequisite / non-stream errors
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

      if (!res.body) throw new Error("No response body");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Process all complete newline-delimited JSON lines
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // last partial line back to buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line) as StreamEvent;

            if (event.t === "step") {
              setSteps(prev => {
                // Close the previous step if it's an agent_call (content done)
                const closed = prev.map((s, i) =>
                  i === prev.length - 1 ? { ...s, done: true } : s,
                );
                return [
                  ...closed,
                  { kind: event.kind, label: event.label, content: event.content ?? "", done: false },
                ];
              });
            } else if (event.t === "delta") {
              setSteps(prev => {
                if (prev.length === 0) return prev;
                const last = { ...prev[prev.length - 1], content: prev[prev.length - 1].content + event.text };
                return [...prev.slice(0, -1), last];
              });
            } else if (event.t === "done") {
              setSteps(prev => prev.map((s, i) => i === prev.length - 1 ? { ...s, done: true } : s));
              setRunId(event.runId);
              setStatus("done");
              router.refresh();
            } else if (event.t === "err") {
              setErrorMsg(event.message);
              setStatus("error");
            }
          } catch { /* skip malformed lines */ }
        }
      }
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Unknown error");
      setStatus("error");
    }
  }

  const agent = AGENTS.find(a => a.name === selectedAgent)!;

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
        {/* Agent selection */}
        <section className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-[#1c1e3b] mb-4">Select Agent</h2>
          <div className="grid grid-cols-2 gap-2">
            {AGENTS.map(a => (
              <button
                key={a.name}
                onClick={() => setSelectedAgent(a.name)}
                disabled={status === "running"}
                className={`text-left p-3 rounded-lg border transition ${
                  selectedAgent === a.name
                    ? "border-[#b3cc26] bg-[#f8fbea]"
                    : "border-gray-100 hover:border-gray-200"
                } disabled:opacity-50`}
              >
                <p className={`text-sm font-medium ${selectedAgent === a.name ? "text-[#1c1e3b]" : "text-gray-700"}`}>
                  {a.label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 leading-snug">{a.description}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Prerequisites warning */}
        {!prereq.ok && (
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

        {/* Instructions + Run */}
        <section className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-[#1c1e3b] mb-1">{agent.label}</h2>
          <p className="text-xs text-gray-400 mb-3">{agent.description}</p>

          <textarea
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            disabled={status === "running"}
            placeholder="Optional: additional instructions or focus areas for this run…"
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#b3cc26] resize-y disabled:opacity-50"
          />

          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={handleRun}
              disabled={status === "running" || !prereq.ok}
              className="flex items-center gap-2 bg-[#1c1e3b] text-white font-semibold text-sm px-4 py-2 rounded-lg hover:bg-[#2a2d52] disabled:opacity-50 transition"
            >
              {status === "running" && <Loader2 size={14} className="animate-spin" />}
              {status === "running" ? "Running…" : "Run Agent"}
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

        {/* Processing log */}
        {steps.length > 0 && (
          <section className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-[#1c1e3b] mb-3">
              Processing Log
              {status === "running" && (
                <span className="ml-2 text-xs font-normal text-gray-400 flex items-center gap-1 inline-flex">
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
      </div>
    </div>
  );
}
