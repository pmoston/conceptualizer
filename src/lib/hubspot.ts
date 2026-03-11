import { Client } from "@hubspot/api-client";
import { FilterOperatorEnum } from "@hubspot/api-client/lib/codegen/crm/companies/models/Filter";
import { db } from "@/lib/db";

export const hubspot = new Client({
  accessToken: process.env.HUBSPOT_API_KEY,
});

// --- Browse (read-only, no DB writes) ---

export async function browseCompanies(search?: string) {
  if (search) {
    const response = await hubspot.crm.companies.searchApi.doSearch({
      filterGroups: [],
      query: search,
      properties: ["name", "domain", "industry"],
      limit: 50,
      after: "0",
      sorts: [],
    });
    return response.results.map((c) => ({
      hubspotId: c.id,
      name: c.properties.name ?? "Unknown",
      domain: c.properties.domain ?? null,
      industry: c.properties.industry ?? null,
    }));
  }

  const response = await hubspot.crm.companies.basicApi.getPage(
    100, undefined, ["name", "domain", "industry"]
  );
  return response.results.map((c) => ({
    hubspotId: c.id,
    name: c.properties.name ?? "Unknown",
    domain: c.properties.domain ?? null,
    industry: c.properties.industry ?? null,
  }));
}

// --- Selective import ---

async function fetchOwnerMap() {
  const response = await hubspot.crm.owners.ownersApi.getPage(undefined, undefined, 100);
  return new Map(
    response.results.map((o) => [o.id, `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim()])
  );
}

export async function importCompanies(hubspotIds: string[]) {
  const ownerMap = await fetchOwnerMap();
  let imported = 0;

  for (const hubspotId of hubspotIds) {
    const company = await hubspot.crm.companies.basicApi.getById(
      hubspotId, ["name", "domain", "industry"]
    );

    await db.customer.upsert({
      where: { hubspotId },
      update: {
        name: company.properties.name ?? "Unknown",
        domain: company.properties.domain ?? null,
        industry: company.properties.industry ?? null,
      },
      create: {
        hubspotId,
        name: company.properties.name ?? "Unknown",
        domain: company.properties.domain ?? null,
        industry: company.properties.industry ?? null,
      },
    });

    // Import contacts for this company
    const contacts = await hubspot.crm.contacts.searchApi.doSearch({
      filterGroups: [{
        filters: [{ propertyName: "associatedcompanyid", operator: FilterOperatorEnum.Eq, value: hubspotId }],
      }],
      properties: ["firstname", "lastname", "email", "jobtitle"],
      limit: 100,
      after: "0",
      sorts: [],
      query: "",
    });

    const customer = await db.customer.findUnique({ where: { hubspotId } });
    if (!customer) continue;

    for (const contact of contacts.results) {
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
    }

    // Import deals for this company
    const deals = await hubspot.crm.deals.searchApi.doSearch({
      filterGroups: [{
        filters: [{ propertyName: "associations.company", operator: FilterOperatorEnum.Eq, value: hubspotId }],
      }],
      properties: ["dealname", "dealstage", "amount", "currency", "closedate", "hubspot_owner_id"],
      limit: 100,
      after: "0",
      sorts: [],
      query: "",
    });

    for (const deal of deals.results) {
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
    }

    imported++;
  }

  return imported;
}
