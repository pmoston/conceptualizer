import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Nav from "@/components/layout/Nav";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.authenticated) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Nav />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
