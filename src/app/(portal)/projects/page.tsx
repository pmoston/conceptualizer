import Link from "next/link";
import { db } from "@/lib/db";
import { Plus } from "lucide-react";
import { ProjectStatus, Language } from "@prisma/client";
import HelpLink from "@/components/HelpLink";

const statusColors: Record<ProjectStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-500",
  IN_PROGRESS: "bg-blue-50 text-blue-600",
  REVIEW: "bg-yellow-50 text-yellow-600",
  DONE: "bg-green-50 text-green-600",
};

const languageLabels: Record<Language, string> = {
  EN: "English",
  DE: "German",
};

export default async function ProjectsPage() {
  const projects = await db.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { id: true, name: true } },
      deal: { select: { id: true, name: true } },
      _count: { select: { documents: true, agentRuns: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#1c1e3b]">Projects</h1>
            <HelpLink href="/help#projects" />
          </div>
          <p className="text-gray-500 mt-1 text-sm">{projects.length} projects</p>
        </div>
        <Link
          href="/projects/new"
          className="flex items-center gap-2 bg-[#b3cc26] text-[#1c1e3b] text-sm font-semibold px-4 py-2 rounded-lg hover:brightness-105 transition"
        >
          <Plus size={14} /> New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          No projects yet. Create your first project.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Deal</th>
                <th className="px-4 py-3 text-center">Language</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Docs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <Link href={`/projects/${p.id}`} className="font-medium text-[#1c1e3b] hover:text-[#b3cc26]">
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    <Link href={`/customers/${p.customer.id}`} className="hover:text-[#1c1e3b]">
                      {p.customer.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.deal?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {languageLabels[p.language]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[p.status]}`}>
                      {p.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">{p._count.documents}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
