"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProjectStatus } from "@prisma/client";
import { Trash2 } from "lucide-react";

const statuses = Object.values(ProjectStatus);

export default function ProjectActions({ project }: { project: { id: string; status: ProjectStatus } }) {
  const router = useRouter();
  const [status, setStatus] = useState(project.status);
  const [deleting, setDeleting] = useState(false);

  async function handleStatusChange(newStatus: ProjectStatus) {
    setStatus(newStatus);
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Delete this project and all its documents and agent runs?")) return;
    setDeleting(true);
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    router.push("/projects");
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={status}
        onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#b3cc26]"
      >
        {statuses.map((s) => (
          <option key={s} value={s}>{s.replace("_", " ")}</option>
        ))}
      </select>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="p-1.5 text-gray-400 hover:text-red-500 transition"
        title="Delete project"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
