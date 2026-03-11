import Link from "next/link";
import { db } from "@/lib/db";
import ImportDialog from "./ImportDialog";

export default async function CustomersPage() {
  const customers = await db.customer.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { contacts: true, projects: true, deals: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1c1e3b]">Customers</h1>
          <p className="text-gray-500 mt-1 text-sm">{customers.length} companies synced from HubSpot</p>
        </div>
        <ImportDialog />
      </div>

      {customers.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          No customers yet. Click &ldquo;Sync HubSpot&rdquo; to import.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Domain</th>
                <th className="px-4 py-3 text-left">Industry</th>
                <th className="px-4 py-3 text-center">Contacts</th>
                <th className="px-4 py-3 text-center">Deals</th>
                <th className="px-4 py-3 text-center">Projects</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <Link href={`/customers/${c.id}`} className="font-medium text-[#1c1e3b] hover:text-[#b3cc26]">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c.domain ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{c.industry ?? "—"}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{c._count.contacts}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{c._count.deals}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{c._count.projects}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
