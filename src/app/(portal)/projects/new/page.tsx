import { db } from "@/lib/db";
import NewProjectForm from "./NewProjectForm";

export default async function NewProjectPage() {
  const customers = await db.customer.findMany({
    orderBy: { name: "asc" },
    include: { deals: { select: { id: true, name: true } } },
  });

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-[#1c1e3b] mb-6">New Project</h1>
      <NewProjectForm customers={customers} />
    </div>
  );
}
