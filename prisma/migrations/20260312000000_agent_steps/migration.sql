CREATE TYPE "StepType" AS ENUM ('INFO', 'AGENT_CALL', 'AGENT_OUTPUT', 'TOOL_CALL', 'TOOL_RESULT', 'WARNING', 'ERROR');

CREATE TABLE "AgentStep" (
  "id"        TEXT NOT NULL,
  "runId"     TEXT NOT NULL,
  "index"     INTEGER NOT NULL,
  "type"      "StepType" NOT NULL,
  "label"     TEXT NOT NULL,
  "content"   TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentStep_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AgentStep"
  ADD CONSTRAINT "AgentStep_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
