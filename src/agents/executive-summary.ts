import { streamText } from "ai";
import { AgentModels } from "@/lib/models";
import type { AgentInput } from "./types";

export function runExecutiveSummaryAgent(input: AgentInput) {
  const lang = input.language === "DE" ? "German" : "English";

  return streamText({
    model: AgentModels["executive-summary"],
    system: `You are a senior consultant at Dataciders GmbH, a data & AI consulting firm.
Your task is to write a concise executive summary of a concept document.
Produce the summary in ${lang}.
The summary must be self-contained — a busy executive should understand the full picture after reading it alone.
Target length: one page (approx. 300–400 words).`,
    prompt: `Project: ${input.projectTitle}
${input.description ? `Description: ${input.description}\n` : ""}
${input.currentDraft ? `Full concept document:\n${input.currentDraft}` : "No concept document provided — please provide a document to summarise."}

${input.instructions ? `Additional instructions: ${input.instructions}\n\n` : ""}Write an executive summary that covers:
- **Situation** — The client's current challenge or opportunity.
- **Approach** — What Dataciders proposes to do and why.
- **Key Deliverables** — The main outputs the client will receive.
- **Expected Outcome** — The business value and impact.
- **Next Steps** — Immediate actions required to move forward.`,
  });
}
