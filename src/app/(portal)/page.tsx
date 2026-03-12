import Link from "next/link";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { ProjectStatus, AgentStatus, Platform } from "@prisma/client";

export default async function DashboardPage() {
  try { await requireAuth(); } catch { redirect("/login"); }

  const now         = new Date();
  const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    customerCount,
    customerCountMonth,
    projectStatusCounts,
    projectCountMonth,
    languageCounts,
    platformCounts,
    documentCount,
    documentCountMonth,
    agentRunCounts,
    agentRunCountMonth,
    recentProjects,
    recentRuns,
    topCustomers,
  ] = await Promise.all([
    db.customer.count(),
    db.customer.count({ where: { createdAt: { gte: monthStart } } }),

    db.project.groupBy({ by: ["status"], _count: { _all: true } }),
    db.project.count({ where: { createdAt: { gte: monthStart } } }),

    db.project.groupBy({ by: ["language"], _count: { _all: true } }),
    db.project.groupBy({ by: ["platform"], _count: { _all: true } }),

    db.document.count(),
    db.document.count({ where: { createdAt: { gte: monthStart } } }),

    db.agentRun.groupBy({ by: ["status"], _count: { _all: true } }),
    db.agentRun.count({ where: { startedAt: { gte: monthStart } } }),

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

    db.customer.findMany({
      orderBy: { projects: { _count: "desc" } },
      take: 5,
      include: { _count: { select: { projects: true } } },
    }),
  ]);

  const byStatus = Object.fromEntries(
    projectStatusCounts.map(r => [r.status, r._count._all])
  ) as Partial<Record<ProjectStatus, number>>;
  const totalProjects = projectStatusCounts.reduce((s, r) => s + r._count._all, 0);

  const byLang = Object.fromEntries(languageCounts.map(r => [r.language, r._count._all]));
  const byPlatform = Object.fromEntries(
    platformCounts.filter(r => r.platform).map(r => [r.platform!, r._count._all])
  ) as Partial<Record<Platform, number>>;

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

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
        <StatCard
          label="Customers"
          value={customerCount}
          href="/customers"
          sub={<MonthBadge count={customerCountMonth} />}
        />
        <StatCard
          label="Projects"
          value={totalProjects}
          href="/projects"
          sub={
            <>
              <MonthBadge count={projectCountMonth} />
              <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1.5">
                {PROJECT_STATUS_META.map(({ status, color, label }) =>
                  (byStatus[status] ?? 0) > 0 ? (
                    <span key={status} className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${color}`}>
                      {byStatus[status]} {label}
                    </span>
                  ) : null
                )}
              </div>
              {(byLang.DE || byLang.EN) && (
                <p className="text-xs text-gray-400 mt-1.5">
                  {byLang.DE ?? 0} DE · {byLang.EN ?? 0} EN
                </p>
              )}
            </>
          }
        />
        <StatCard
          label="Documents"
          value={documentCount}
          href="/projects"
          sub={<MonthBadge count={documentCountMonth} />}
        />
        <StatCard
          label="Agent Runs"
          value={totalRuns}
          href="/projects"
          sub={
            <>
              <MonthBadge count={agentRunCountMonth} />
              <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1.5 text-xs">
                {completedRuns > 0 && <span className="text-green-600">{completedRuns} done</span>}
                {activeRuns    > 0 && <span className="text-blue-500">{activeRuns} active</span>}
                {failedRuns    > 0 && <span className="text-red-500">{failedRuns} failed</span>}
              </div>
            </>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">

        {/* ── Recent projects ──────────────────────────────────────────────── */}
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

        {/* ── Recent agent runs ────────────────────────────────────────────── */}
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* ── Most active customers ────────────────────────────────────────── */}
        <Panel title="Most Active Customers" href="/customers" linkLabel="All customers">
          {topCustomers.filter(c => c._count.projects > 0).length === 0 ? (
            <Empty>No projects yet.</Empty>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {topCustomers.filter(c => c._count.projects > 0).map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 pr-3">
                      <Link href={`/customers/${c.id}`} className="font-medium text-[#1c1e3b] hover:text-[#b3cc26] transition-colors">
                        {c.name}
                      </Link>
                      {c.industry && <div className="text-xs text-gray-400 mt-0.5">{c.industry}</div>}
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <span className="text-xs bg-gray-100 text-[#1c1e3b] px-2 py-0.5 rounded-full font-medium">
                        {c._count.projects} project{c._count.projects !== 1 ? "s" : ""}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        {/* ── Projects by platform ─────────────────────────────────────────── */}
        <Panel title="Projects by Platform" href="/projects" linkLabel="All projects">
          {Object.keys(byPlatform).length === 0 ? (
            <Empty>No platform data yet — set a platform on your projects.</Empty>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {PLATFORM_META.filter(p => (byPlatform[p.value] ?? 0) > 0).map(p => (
                  <tr key={p.value} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 pr-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.color}`}>
                        {p.label}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div
                          className="h-1.5 rounded-full bg-[#b3cc26] opacity-60"
                          style={{ width: `${Math.max(8, ((byPlatform[p.value] ?? 0) / totalProjects) * 80)}px` }}
                        />
                        <span className="text-xs text-gray-500 w-6 text-right">{byPlatform[p.value]}</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {(platformCounts.find(r => !r.platform)?._count._all ?? 0) > 0 && (
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 pr-3 text-xs text-gray-400">Not specified</td>
                    <td className="py-2.5 text-right text-xs text-gray-400">
                      {platformCounts.find(r => !r.platform)?._count._all}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </div>
  );
}

// ── Metadata ─────────────────────────────────────────────────────────────────

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

const PLATFORM_META: { value: Platform; label: string; color: string }[] = [
  { value: "MICROSOFT_FABRIC", label: "Microsoft Fabric", color: "bg-blue-50 text-blue-700" },
  { value: "MICROSOFT_AZURE",  label: "Microsoft Azure",  color: "bg-sky-50 text-sky-700" },
  { value: "DATABRICKS",       label: "Databricks",       color: "bg-orange-50 text-orange-700" },
  { value: "DENODO",           label: "Denodo",           color: "bg-purple-50 text-purple-700" },
  { value: "OTHER",            label: "Other",            color: "bg-gray-100 text-gray-500" },
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

// ── Sub-components ────────────────────────────────────────────────────────────

function MonthBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return <p className="text-xs text-[#b3cc26] mt-0.5">+{count} this month</p>;
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
