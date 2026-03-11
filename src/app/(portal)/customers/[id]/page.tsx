import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ArrowLeft, Mail, Briefcase } from "lucide-react";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { lastName: "asc" } },
      deals: { orderBy: { createdAt: "desc" } },
      projects: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!customer) notFound();

  return (
    <div className="max-w-4xl">
      <Link href="/customers" className="flex items-center gap-1 text-sm text-gray-400 hover:text-[#1c1e3b] mb-6">
        <ArrowLeft size={14} /> Back to customers
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1c1e3b]">{customer.name}</h1>
        <div className="flex gap-4 mt-1 text-sm text-gray-500">
          {customer.domain && <span>{customer.domain}</span>}
          {customer.industry && <span>{customer.industry}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Contacts */}
        <section className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-[#1c1e3b] mb-4">Contacts ({customer.contacts.length})</h2>
          {customer.contacts.length === 0 ? (
            <p className="text-sm text-gray-400">No contacts synced.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {customer.contacts.map((c) => (
                <div key={c.id} className="py-3 flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm text-[#1c1e3b]">{c.firstName} {c.lastName}</p>
                    {c.jobTitle && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Briefcase size={10} />{c.jobTitle}</p>}
                  </div>
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="text-xs text-gray-400 hover:text-[#1c1e3b] flex items-center gap-1">
                      <Mail size={10} />{c.email}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Deals */}
        <section className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-[#1c1e3b] mb-4">Deals ({customer.deals.length})</h2>
          {customer.deals.length === 0 ? (
            <p className="text-sm text-gray-400">No deals synced.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {customer.deals.map((d) => (
                <div key={d.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-[#1c1e3b]">{d.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{d.stage ?? "—"}{d.ownerName ? ` · ${d.ownerName}` : ""}</p>
                  </div>
                  <div className="text-right">
                    {d.amount != null && (
                      <p className="text-sm font-medium text-[#1c1e3b]">
                        {d.currency ?? ""} {d.amount.toLocaleString()}
                      </p>
                    )}
                    {d.closeDate && (
                      <p className="text-xs text-gray-400">{new Date(d.closeDate).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Projects */}
        <section className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-[#1c1e3b] mb-4">Projects ({customer.projects.length})</h2>
          {customer.projects.length === 0 ? (
            <p className="text-sm text-gray-400">No projects yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {customer.projects.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between">
                  <Link href={`/projects/${p.id}`} className="font-medium text-sm text-[#1c1e3b] hover:text-[#b3cc26]">
                    {p.title}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{p.language}</span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
