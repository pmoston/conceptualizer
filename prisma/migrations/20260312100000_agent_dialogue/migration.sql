-- Add AWAITING_INPUT to AgentStatus enum
ALTER TYPE "AgentStatus" ADD VALUE 'AWAITING_INPUT';

-- Create MessageRole enum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'AGENT');

-- Create AgentMessage table
CREATE TABLE "AgentMessage" (
    "id"        TEXT NOT NULL,
    "runId"     TEXT NOT NULL,
    "role"      "MessageRole" NOT NULL,
    "content"   TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentMessage_pkey" PRIMARY KEY ("id")
);

-- Foreign key to AgentRun
ALTER TABLE "AgentMessage"
    ADD CONSTRAINT "AgentMessage_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
