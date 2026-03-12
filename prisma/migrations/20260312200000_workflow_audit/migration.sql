-- Create WorkflowAuditLog table
CREATE TABLE "WorkflowAuditLog" (
    "id"        TEXT NOT NULL,
    "runId"     TEXT NOT NULL,
    "iteration" INTEGER NOT NULL DEFAULT 0,
    "phase"     TEXT NOT NULL,
    "verdict"   TEXT,
    "details"   TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowAuditLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WorkflowAuditLog"
    ADD CONSTRAINT "WorkflowAuditLog_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
