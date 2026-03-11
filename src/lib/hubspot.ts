import { Client } from "@hubspot/api-client";
import { db } from "@/lib/db";

export const hubspot = new Client({
  accessToken: process.env.HUBSPOT_API_KEY,
});

export async function syncCompanies() {
  let after: string | undefined;
  let synced = 0;

  do {
    const response = await hubspot.crm.companies.basicApi.getPage(
      100,
      after,
      ["name", "domain", "industry"],
    );

    for (const company of response.results) {
      await db.customer.upsert({
        where: { hubspotId: company.id },
        update: {
          name: company.properties.name ?? "Unknown",
          domain: company.properties.domain ?? null,
          industry: company.properties.industry ?? null,
        },
        create: {
          hubspotId: company.id,
          name: company.properties.name ?? "Unknown",
          domain: company.properties.domain ?? null,
          industry: company.properties.industry ?? null,
        },
      });
      synced++;
    }

    after = response.paging?.next?.after;
  } while (after);

  return synced;
}

export async function syncContacts() {
  let after: string | undefined;
  let synced = 0;

  do {
    const response = await hubspot.crm.contacts.basicApi.getPage(
      100,
      after,
      ["firstname", "lastname", "email", "jobtitle"],
      undefined,
      ["associations.company"],
    );

    for (const contact of response.results) {
      const companyId = contact.associations?.companies?.results?.[0]?.id;
      if (!companyId) continue;

      const customer = await db.customer.findUnique({
        where: { hubspotId: companyId },
      });
      if (!customer) continue;

      await db.contact.upsert({
        where: { hubspotId: contact.id },
        update: {
          firstName: contact.properties.firstname ?? "",
          lastName: contact.properties.lastname ?? "",
          email: contact.properties.email ?? null,
          jobTitle: contact.properties.jobtitle ?? null,
          customerId: customer.id,
        },
        create: {
          hubspotId: contact.id,
          firstName: contact.properties.firstname ?? "",
          lastName: contact.properties.lastname ?? "",
          email: contact.properties.email ?? null,
          jobTitle: contact.properties.jobtitle ?? null,
          customerId: customer.id,
        },
      });
      synced++;
    }

    after = response.paging?.next?.after;
  } while (after);

  return synced;
}

export async function syncDeals() {
  let after: string | undefined;
  let synced = 0;

  // Fetch owners once for name resolution
  const ownersResponse = await hubspot.crm.owners.ownersApi.getPage(undefined, undefined, 100);
  const ownerMap = new Map(
    ownersResponse.results.map((o) => [
      o.id,
      `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim(),
    ])
  );

  do {
    const response = await hubspot.crm.deals.basicApi.getPage(
      100,
      after,
      ["dealname", "dealstage", "amount", "currency", "closedate", "hubspot_owner_id"],
      undefined,
      ["associations.company"],
    );

    for (const deal of response.results) {
      const companyId = deal.associations?.companies?.results?.[0]?.id;
      if (!companyId) continue;

      const customer = await db.customer.findUnique({
        where: { hubspotId: companyId },
      });
      if (!customer) continue;

      const ownerName = deal.properties.hubspot_owner_id
        ? (ownerMap.get(deal.properties.hubspot_owner_id) ?? null)
        : null;

      await db.deal.upsert({
        where: { hubspotId: deal.id },
        update: {
          name: deal.properties.dealname ?? "Unknown",
          stage: deal.properties.dealstage ?? null,
          amount: deal.properties.amount ? parseFloat(deal.properties.amount) : null,
          currency: deal.properties.currency ?? null,
          closeDate: deal.properties.closedate ? new Date(deal.properties.closedate) : null,
          ownerName,
          customerId: customer.id,
        },
        create: {
          hubspotId: deal.id,
          name: deal.properties.dealname ?? "Unknown",
          stage: deal.properties.dealstage ?? null,
          amount: deal.properties.amount ? parseFloat(deal.properties.amount) : null,
          currency: deal.properties.currency ?? null,
          closeDate: deal.properties.closedate ? new Date(deal.properties.closedate) : null,
          ownerName,
          customerId: customer.id,
        },
      });
      synced++;
    }

    after = response.paging?.next?.after;
  } while (after);

  return synced;
}
