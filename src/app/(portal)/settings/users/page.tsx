import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import UserManagement from "./UserManagement";

export default async function UsersSettingsPage() {
  try { await requireRole("ADMIN"); } catch { redirect("/"); }

  const users = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  });

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-[#1c1e3b] mb-1">User Management</h1>
      <p className="text-gray-500 text-sm mb-8">Manage who has access to Conceptualizer and their permissions.</p>
      <UserManagement users={users} />
    </div>
  );
}
