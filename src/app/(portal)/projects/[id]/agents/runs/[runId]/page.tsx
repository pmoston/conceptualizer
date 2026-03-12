import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, Bot, Info, Wrench, TriangleAlert, CircleX, CheckCircle2 } from "lucide-react";
import type { StepType } from "@prisma/client";

const stepIcon: Record<StepType, React.ReactNode> = {
  INFO:         <Info size={13} className="text-gray-400 shrink-0 mt-0.5" />,
  AGENT_CALL:   <Bot size={13} className="text-[#1c1e3b] shrink-0 mt-0.5" />,
  AGENT_OUTPUT: <CheckCircle2 size={13} className="text-green-500 shrink-0 mt-0.5" />,
  TOOL_CALL:    <Wrench size={13} className="text-blue-400 shrink-0 mt-0.5" />,
  TOOL_RESULT:  <Wrench size={13} className="text-blue-600 shrink-0 mt-0.5" />,
  WARNING:      <TriangleAlert size={13} className="text-orange-400 shrink-0 mt-0.5" />,
  ERROR:        <CircleX size={13} className="text-red-500 shrink-0 mt-0.5" />,
};

const statusColors: Record<string, string> = {
  COMPLETED:      "bg-green-50 text-green-600",
  FAILED:         "bg-red-50 text-red-500",
  RUNNING:        "bg-blue-50 text-blue-600",
  AWAITING_INPUT: "bg-yellow-50 text-yellow-700",
  PENDING:        "bg-gray-100 text-gray-500",
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

type Params = { params: Promise<{ id: string; runId: string }> };

export default async function RunDetailPage({ params }: Params) {
  const { id: projectId, runId } = await params;

  const run = await db.agentRun.findUnique({
    where:   { id: runId },
    include: {
      steps:     { orderBy: { index: "asc" } },
      messages:  { orderBy: { createdAt: "asc" } },
      auditLogs: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!run || run.projectId !== projectId) notFound();

  const durationMs =
    run.completedAt && run.startedAt
      ? run.completedAt.getTime() - run.startedAt.getTime()
      : null;

  return (
    <div className="max-w-4xl">
      <Link
        href={`/projects/${projectId}`}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-[#1c1e3b] mb-6"
      >
        <ArrowLeft size={14} /> Back to project
      </Link>

      {/* Run metadata */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#1c1e3b]">
              {agentLabels[run.agentName] ?? run.agentName}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {new Date(run.startedAt).toLocaleString()}
              {durationMs !== null && (
                <span className="ml-2">· {(durationMs / 1000).toFixed(1)} s</span>
              )}
            </p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[run.status] ?? "bg-gray-100 text-gray-500"}`}>
            {run.status}
          </span>
        </div>

        {run.error && (
          <pre className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg p-3 whitespace-pre-wrap">
            {run.error}
          </pre>
        )}
      </div>

      {/* Steps log */}
      {run.steps.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-100 p-5 mb-5">
          <h2 className="font-semibold text-[#1c1e3b] mb-4">Processing Steps</h2>
          <div className="space-y-1">
            {run.steps.map(step => (
              <div key={step.id} className="border-l-2 border-gray-100 pl-3 py-1">
                <div className="flex items-start gap-2">
                  {stepIcon[step.type]}
                  <span className="text-xs text-gray-600">{step.label}</span>
                </div>
                {step.content && (step.type === "AGENT_OUTPUT" || step.type === "AGENT_CALL") && (
                  <details className="mt-1 ml-5">
                    <summary className="text-xs text-gray-400 cursor-pointer select-none">
                      Show output ({step.content.length} chars)
                    </summary>
                    <pre className="mt-1 text-xs text-gray-500 font-sans whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto bg-gray-50 rounded p-2">
                      {step.content}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Workflow audit log */}
      {run.auditLogs.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-100 p-5 mb-5">
          <h2 className="font-semibold text-[#1c1e3b] mb-4">Workflow Audit Log</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-400">
                  <th className="pb-2 pr-4 font-medium w-8">#</th>
                  <th className="pb-2 pr-4 font-medium">Phase</th>
                  <th className="pb-2 pr-4 font-medium">Verdict</th>
                  <th className="pb-2 pr-4 font-medium">Details</th>
                  <th className="pb-2 font-medium whitespace-nowrap">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {run.auditLogs.map(log => (
                  <tr key={log.id} className="align-top">
                    <td className="py-2 pr-4 text-gray-300">{log.iteration}</td>
                    <td className="py-2 pr-4 font-mono text-[#1c1e3b]">{log.phase}</td>
                    <td className="py-2 pr-4">
                      {log.verdict === "PASS" && (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <CheckCircle2 size={11} /> PASS
                        </span>
                      )}
                      {log.verdict === "FAIL" && (
                        <span className="inline-flex items-center gap-1 text-red-500">
                          <CircleX size={11} /> FAIL
                        </span>
                      )}
                      {log.verdict === "WARN" && (
                        <span className="inline-flex items-center gap-1 text-orange-500">
                          <TriangleAlert size={11} /> WARN
                        </span>
                      )}
                      {!log.verdict && <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-2 pr-4 text-gray-500 max-w-sm">{log.details}</td>
                    <td className="py-2 text-gray-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Dialogue history */}
      {run.messages.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-100 p-5 mb-5">
          <h2 className="font-semibold text-[#1c1e3b] mb-4">Dialogue History</h2>
          <div className="space-y-4">
            {run.messages.map(msg => (
              <div key={msg.id} className={`rounded-lg p-3 ${msg.role === "USER" ? "bg-[#f8fbea] border border-[#b3cc26]/30 ml-8" : "bg-gray-50 border border-gray-100"}`}>
                <p className="text-xs font-medium mb-1 text-gray-500">
                  {msg.role === "USER" ? "Your answers" : "Agent analysis"}
                  <span className="ml-2 font-normal">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                </p>
                <pre className="text-xs text-gray-700 font-sans whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                  {msg.content}
                </pre>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Final output */}
      {run.output && (
        <section className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-[#1c1e3b] mb-3">
            {run.status === "AWAITING_INPUT" ? "Current Brief (Awaiting Input)" : "Final Output"}
          </h2>
          <pre className="text-sm text-gray-700 font-sans whitespace-pre-wrap leading-relaxed">
            {run.output}
          </pre>
        </section>
      )}
    </div>
  );
}
