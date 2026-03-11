import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const RowSchema = z.record(z.string(), z.string());
const BodySchema = z.object({
  type: z.enum(["companies", "contacts", "deals"]),
  rows: z.array(RowSchema),
});

function col(row: Record<string, string>, ...keys: string[]): string | null {
  for (const k of keys) {
    const found = Object.entries(row).find(([key]) => key.toLowerCase() === k.toLowerCase());
    if (found && found[1].trim()) return found[1].trim();
  }
  return null;
}

export async function POST(req: NextRequest) {
  try { await requireAuth(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { type, rows } = parsed.data;
  let imported = 0;
  const errors: string[] = [];

  if (type === "companies") {
    for (const row of rows) {
      const hubspotId = col(row, "record id");
      const name = col(row, "company name", "name");
      if (!name) continue;
      try {
        const data = { name, domain: col(row, "company domain name", "domain"), industry: col(row, "industry") };
        if (hubspotId) {
          await db.customer.upsert({ where: { hubspotId }, update: data, create: { hubspotId, ...data } });
        } else {
          await db.customer.create({ data });
        }
        imported++;
      } catch (e) {
        errors.push(`Row skipped: ${name}`);
      }
    }
  } else if (type === "contacts") {
    for (const row of rows) {
      const hubspotId = col(row, "record id");
      const firstName = col(row, "first name") ?? "";
      const lastName = col(row, "last name") ?? "";
      const companyHubspotId = col(row, "associated company id");
      if (!firstName && !lastName) continue;

      const customer = companyHubspotId
        ? await db.customer.findUnique({ where: { hubspotId: companyHubspotId } })
        : null;
      if (!customer) { errors.push(`No matching company for contact ${firstName} ${lastName}`); continue; }

      try {
        if (hubspotId) {
          await db.contact.upsert({
            where: { hubspotId },
            update: { firstName, lastName, email: col(row, "email", "email address"), jobTitle: col(row, "job title"), customerId: customer.id },
            create: { hubspotId, firstName, lastName, email: col(row, "email", "email address"), jobTitle: col(row, "job title"), customerId: customer.id },
          });
        } else {
          await db.contact.create({ data: { firstName, lastName, email: col(row, "email", "email address"), jobTitle: col(row, "job title"), customerId: customer.id } });
        }
        imported++;
      } catch (e) {
        errors.push(`Row skipped: ${firstName} ${lastName}`);
      }
    }
  } else if (type === "deals") {
    for (const row of rows) {
      const hubspotId = col(row, "record id");
      const name = col(row, "deal name", "name");
      const companyHubspotId = col(row, "associated company id");
      if (!name) continue;

      const customer = companyHubspotId
        ? await db.customer.findUnique({ where: { hubspotId: companyHubspotId } })
        : null;
      if (!customer) { errors.push(`No matching company for deal ${name}`); continue; }

      const amountStr = col(row, "amount");
      const amount = amountStr ? parseFloat(amountStr) : null;
      const closeDateStr = col(row, "close date");
      const closeDate = closeDateStr ? new Date(closeDateStr) : null;

      try {
        if (hubspotId) {
          await db.deal.upsert({
            where: { hubspotId },
            update: { name, stage: col(row, "deal stage"), amount, currency: col(row, "currency"), closeDate, ownerName: col(row, "hubspot owner"), customerId: customer.id },
            create: { hubspotId, name, stage: col(row, "deal stage"), amount, currency: col(row, "currency"), closeDate, ownerName: col(row, "hubspot owner"), customerId: customer.id },
          });
        } else {
          await db.deal.create({ data: { name, stage: col(row, "deal stage"), amount, currency: col(row, "currency"), closeDate, ownerName: col(row, "hubspot owner"), customerId: customer.id } });
        }
        imported++;
      } catch (e) {
        errors.push(`Row skipped: ${name}`);
      }
    }
  }

  return NextResponse.json({ imported, errors });
}
