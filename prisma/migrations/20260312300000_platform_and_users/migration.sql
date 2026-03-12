-- Platform enum and field
CREATE TYPE "Platform" AS ENUM ('MICROSOFT_FABRIC', 'MICROSOFT_AZURE', 'DATABRICKS', 'DENODO', 'OTHER');
ALTER TABLE "Project" ADD COLUMN "platform" "Platform";

-- User role enum and User table
CREATE TYPE "UserRole" AS ENUM ('VIEWER', 'CONSULTANT', 'ADMIN');

CREATE TABLE "User" (
    "id"           TEXT NOT NULL,
    "email"        TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role"         "UserRole" NOT NULL DEFAULT 'CONSULTANT',
    "isActive"     BOOLEAN NOT NULL DEFAULT true,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
