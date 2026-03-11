import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import AgentRunner from "./AgentRunner";

type Params = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ agent?: string }>;
};

export default async function AgentsPage({ params, searchParams }: Params) {
  const { id } = await params;
  const { agent: defaultAgent } = await searchParams;

  const project = await db.project.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      language: true,
      documents: { select: { type: true, ocrText: true, name: true } },
    },
  });
  if (!project) notFound();

  const { documents, ...projectMeta } = project;

  return (
    <AgentRunner
      project={projectMeta}
      documents={documents}
      defaultAgent={defaultAgent}
    />
  );
}
