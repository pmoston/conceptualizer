import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ArrowLeft } from "lucide-react";
import { ProjectStatus, Language, Platform } from "@prisma/client";
import ProjectActions from "./ProjectActions";
import EditProjectDialog from "./EditProjectDialog";
import DocumentList from "./DocumentList";
import HelpLink from "@/components/HelpLink";

const statusColors: Record<ProjectStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-500",
  IN_PROGRESS: "bg-blue-50 text-blue-600",
  REVIEW: "bg-yellow-50 text-yellow-600",
  DONE: "bg-green-50 text-green-600",
};

const languageLabels: Record<Language, string> = { EN: "English", DE: "German" };

const platformLabels: Record<Platform, string> = {
  MICROSOFT_FABRIC: "Microsoft Fabric",
  MICROSOFT_AZURE:  "Microsoft Azure",
  DATABRICKS:       "Databricks",
  DENODO:           "Denodo",
  OTHER:            "Other",
};

const platformColors: Record<Platform, string> = {
  MICROSOFT_FABRIC: "bg-blue-50 text-blue-700",
  MICROSOFT_AZURE:  "bg-sky-50 text-sky-700",
  DATABRICKS:       "bg-orange-50 text-orange-700",
  DENODO:           "bg-purple-50 text-purple-700",
  OTHER:            "bg-gray-100 text-gray-500",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await db.project.findUnique({
    where: { id },
    include: {
      customer: { include: { deals: { orderBy: { name: "asc" } } } },
      deal: true,
      documents: { orderBy: { createdAt: "desc" } },
      agentRuns: { orderBy: { startedAt: "desc" } },
    },
  });

  if (!project) notFound();

  return (
    <div className="max-w-4xl">
      <Link href="/projects" className="flex items-center gap-1 text-sm text-gray-400 hover:text-[#1c1e3b] mb-6">
        <ArrowLeft size={14} /> Back to projects
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1c1e3b]">{project.title}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <Link href={`/customers/${project.customer.id}`} className="text-sm text-gray-500 hover:text-[#1c1e3b]">
              {project.customer.name}
            </Link>
            {project.deal && <span className="text-sm text-gray-400">· {project.deal.name}</span>}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[project.status]}`}>
              {project.status.replace("_", " ")}
            </span>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {languageLabels[project.language]}
            </span>
            {project.platform && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${platformColors[project.platform]}`}>
                {platformLabels[project.platform]}
              </span>
            )}
          </div>
          {project.description && <p className="text-sm text-gray-500 mt-3 max-w-xl whitespace-pre-wrap">{project.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <EditProjectDialog
            project={{ id: project.id, title: project.title, language: project.language, platform: project.platform, description: project.description, dealId: project.dealId }}
            deals={project.customer.deals ?? []}
          />
          <ProjectActions project={{ id: project.id, status: project.status }} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Documents */}
        <section className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-[#1c1e3b]">Documents ({project.documents.length})</h2>
              <HelpLink href="/help#documents" />
            </div>
            <Link
              href={`/projects/${id}/documents/upload`}
              className="text-xs bg-[#b3cc26] text-[#1c1e3b] font-medium px-3 py-1.5 rounded-lg hover:brightness-105 transition"
            >
              Upload
            </Link>
          </div>
          <DocumentList documents={project.documents} projectId={id} />
        </section>

        {/* Agent launch buttons */}
        <section className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-[#1c1e3b] mb-4">Agents</h2>
          <div className="grid grid-cols-4 gap-2">
            {[
              { name: "read-materials",          label: "Read Materials" },
              { name: "draft",                   label: "Draft Concept" },
              { name: "fact-check",              label: "Fact-Check" },
              { name: "humanize",                label: "Humanize" },
              { name: "corporate-design-review", label: "Corp. Design Review" },
              { name: "translate",               label: "Translate" },
              { name: "executive-summary",       label: "Exec. Summary" },
              { name: "qa-checklist",            label: "QA Checklist" },
            ].map(agent => (
              <Link
                key={agent.name}
                href={`/projects/${id}/agents?agent=${agent.name}`}
                className="flex items-center justify-center text-center text-xs font-medium bg-[#1c1e3b] text-white px-3 py-2 rounded-lg hover:bg-[#2a2d52] transition leading-snug"
              >
                {agent.label}
              </Link>
            ))}
          </div>
        </section>

        {/* Agent run history */}
        <section className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-[#1c1e3b] mb-4">
            Agent Run History ({project.agentRuns.length})
          </h2>
          {project.agentRuns.length === 0 ? (
            <p className="text-sm text-gray-400">No agent runs yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {project.agentRuns.map((run) => (
                <Link
                  key={run.id}
                  href={`/projects/${id}/agents/runs/${run.id}`}
                  className="py-3 flex items-center justify-between group hover:bg-gray-50 -mx-2 px-2 rounded-lg transition"
                >
                  <div>
                    <p className="text-sm font-medium text-[#1c1e3b] group-hover:underline">{run.agentName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(run.startedAt).toLocaleString()}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    run.status === "COMPLETED" ? "bg-green-50 text-green-600" :
                    run.status === "FAILED"    ? "bg-red-50 text-red-500" :
                    run.status === "RUNNING"   ? "bg-blue-50 text-blue-600" :
                    "bg-gray-100 text-gray-500"
                  }`}>
                    {run.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
