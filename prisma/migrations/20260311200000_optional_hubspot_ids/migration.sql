-- AlterTable: make hubspotId nullable on Customer, Contact, Deal
ALTER TABLE "Customer" ALTER COLUMN "hubspotId" DROP NOT NULL;
ALTER TABLE "Contact" ALTER COLUMN "hubspotId" DROP NOT NULL;
ALTER TABLE "Deal" ALTER COLUMN "hubspotId" DROP NOT NULL;
