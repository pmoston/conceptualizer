import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import UploadForm from "./UploadForm";

export default async function UploadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!project) notFound();

  return (
    <div className="max-w-xl">
      <Link href={`/projects/${id}`} className="flex items-center gap-1 text-sm text-gray-400 hover:text-[#1c1e3b] mb-6">
        <ArrowLeft size={14} /> Back to project
      </Link>
      <h1 className="text-2xl font-bold text-[#1c1e3b] mb-1">Upload Document</h1>
      <p className="text-sm text-gray-500 mb-6">{project.title}</p>
      <UploadForm projectId={id} />
    </div>
  );
}
