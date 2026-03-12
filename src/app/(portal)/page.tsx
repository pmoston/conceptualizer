import Link from "next/link";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { ProjectStatus, AgentStatus } from "@prisma/client";

export default async function DashboardPage() {
  try { await requireAuth(); } catch { redirect("/login"); }

  const [
    customerCount,
    projectStatusCounts,
    documentCount,
    agentRunCounts,
    recentProjects,
    recentRuns,
  ] = await Promise.all([
    db.customer.count(),
    db.project.groupBy({ by: ["status"], _count: { _all: true } }),
    db.document.count(),
    db.agentRun.groupBy({ by: ["status"], _count: { _all: true } }),
    db.project.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { customer: { select: { id: true, name: true } } },
    }),
    db.agentRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 5,
      include: { project: { select: { id: true, title: true } } },
    }),
  ]);

  const byStatus = Object.fromEntries(
    projectStatusCounts.map(r => [r.status, r._count._all])
  ) as Partial<Record<ProjectStatus, number>>;
  const totalProjects = projectStatusCounts.reduce((s, r) => s + r._count._all, 0);

  const byRunStatus = Object.fromEntries(
    agentRunCounts.map(r => [r.status, r._count._all])
  ) as Partial<Record<AgentStatus, number>>;
  const completedRuns = byRunStatus.COMPLETED ?? 0;
  const failedRuns    = byRunStatus.FAILED ?? 0;
  const activeRuns    = (byRunStatus.RUNNING ?? 0) + (byRunStatus.AWAITING_INPUT ?? 0);
  const totalRuns     = completedRuns + failedRuns + activeRuns + (byRunStatus.PENDING ?? 0);

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-[#1c1e3b] mb-1">Dashboard</h1>
      <p className="text-gray-500 text-sm mb-8">Overview of your Conceptualizer workspace.</p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
        <StatCard label="Customers" value={customerCount} href="/customers" sub={null} />
        <StatCard
          label="Projects"
          value={totalProjects}
          href="/projects"
          sub={
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1.5">
              {PROJECT_STATUS_META.map(({ status, color, label }) =>
                (byStatus[status] ?? 0) > 0 ? (
                  <span key={status} className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${color}`}>
                    {byStatus[status]} {label}
                  </span>
                ) : null
              )}
            </div>
          }
        />
        <StatCard label="Documents" value={documentCount} href="/projects" sub={null} />
        <StatCard
          label="Agent Runs"
          value={totalRuns}
          href="/projects"
          sub={
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1.5 text-xs">
              {completedRuns > 0 && <span className="text-green-600">{completedRuns} done</span>}
              {activeRuns    > 0 && <span className="text-blue-500">{activeRuns} active</span>}
              {failedRuns    > 0 && <span className="text-red-500">{failedRuns} failed</span>}
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Recent Projects" href="/projects" linkLabel="All projects">
          {recentProjects.length === 0 ? (
            <Empty>No projects yet.</Empty>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {recentProjects.map(p => {
                  const meta = PROJECT_STATUS_META.find(m => m.status === p.status);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 pr-3">
                        <Link href={`/projects/${p.id}`} className="font-medium text-[#1c1e3b] hover:text-[#b3cc26] transition-colors">
                          {p.title || "(Untitled)"}
                        </Link>
                        <div className="text-xs text-gray-400 mt-0.5">
                          <Link href={`/customers/${p.customer.id}`} className="hover:text-[#b3cc26] transition-colors">
                            {p.customer.name}
                          </Link>
                        </div>
                      </td>
                      <td className="py-2.5 pr-2 text-right whitespace-nowrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta?.color ?? "bg-gray-100 text-gray-500"}`}>
                          {meta?.label ?? p.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          {p.language}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="Recent Agent Runs" href="/projects" linkLabel="All projects">
          {recentRuns.length === 0 ? (
            <Empty>No agent runs yet.</Empty>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {recentRuns.map(run => {
                  const meta = RUN_STATUS_META.find(m => m.status === run.status);
                  return (
                    <tr key={run.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 pr-3">
                        <Link
                          href={`/projects/${run.project.id}/agents/runs/${run.id}`}
                          className="font-medium text-[#1c1e3b] hover:text-[#b3cc26] transition-colors"
                        >
                          {AGENT_LABELS[run.agentName] ?? run.agentName}
                        </Link>
                        <div className="text-xs text-gray-400 mt-0.5">
                          <Link href={`/projects/${run.project.id}`} className="hover:text-[#b3cc26] transition-colors">
                            {run.project.title || "(Untitled)"}
                          </Link>
                        </div>
                      </td>
                      <td className="py-2.5 pr-2 text-right whitespace-nowrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta?.color ?? "bg-gray-100 text-gray-500"}`}>
                          {meta?.label ?? run.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap text-xs text-gray-400">
                        {formatRelative(run.startedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </div>
  );
}

const PROJECT_STATUS_META: { status: ProjectStatus; label: string; color: string }[] = [
  { status: "IN_PROGRESS", label: "In Progress", color: "bg-blue-50 text-blue-600" },
  { status: "REVIEW",      label: "Review",      color: "bg-yellow-50 text-yellow-600" },
  { status: "DRAFT",       label: "Draft",       color: "bg-gray-100 text-gray-500" },
  { status: "DONE",        label: "Done",        color: "bg-green-50 text-green-600" },
];

const RUN_STATUS_META: { status: AgentStatus; label: string; color: string }[] = [
  { status: "COMPLETED",      label: "Done",    color: "bg-green-50 text-green-600" },
  { status: "FAILED",         label: "Failed",  color: "bg-red-50 text-red-600" },
  { status: "RUNNING",        label: "Running", color: "bg-blue-50 text-blue-600" },
  { status: "AWAITING_INPUT", label: "Waiting", color: "bg-yellow-50 text-yellow-600" },
  { status: "PENDING",        label: "Pending", color: "bg-gray-100 text-gray-500" },
];

const AGENT_LABELS: Record<string, string> = {
  "read-materials":          "Read Materials",
  "draft":                   "Draft",
  "fact-check":              "Fact-Check",
  "humanize":                "Humanize",
  "corporate-design-review": "CDR",
  "translate":               "Translate",
  "executive-summary":       "Exec. Summary",
  "qa-checklist":            "QA Checklist",
};

function formatRelative(date: Date): string {
  const diffMs  = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1)  return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)   return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

function StatCard({ label, value, href, sub }: {
  label: string; value: number; href: string; sub: React.ReactNode;
}) {
  return (
    <Link href={href} className="block bg-white border border-gray-100 rounded-xl px-5 py-4 hover:border-[#b3cc26] transition-colors group">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold text-[#1c1e3b] group-hover:text-[#b3cc26] transition-colors">{value}</p>
      {sub}
    </Link>
  );
}

function Panel({ title, href, linkLabel, children }: {
  title: string; href: string; linkLabel: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[#1c1e3b]">{title}</h2>
        <Link href={href} className="text-xs text-gray-400 hover:text-[#b3cc26] transition-colors">{linkLabel} →</Link>
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-400 py-4 text-center">{children}</p>;
}
