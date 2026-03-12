import { streamText } from "ai";
import { AgentModels } from "@/lib/models";
import type { AgentInput } from "./types";

export function runExecutiveSummaryAgent(input: AgentInput) {
  const lang = input.language === "DE" ? "German" : "English";

  return streamText({
    model: AgentModels["executive-summary"],
    system: `You are a senior consultant at Dataciders GmbH, a data & AI consulting firm.
Your task is to write a concise executive summary of a concept document in ${lang}.

Apply the SCR framework (Situation → Complication → Resolution):
- **Situation:** What is the client's current state? Establish shared context — facts the reader already knows or can verify.
- **Complication:** What is the problem, gap, or risk that makes action necessary? Why is the status quo insufficient?
- **Resolution:** What does Dataciders propose, and what will it achieve? Be specific about approach and outcome.

Requirements:
- Self-contained: a busy executive must understand the full picture from this section alone, without reading the full concept.
- Target length: one page (approx. 300–400 words). Do not exceed this.
- Lead with the most important insight — do not bury conclusions at the end.
- Use specific figures from the concept document; avoid vague language.
- Do not repeat section headings verbatim from the full document; write in flowing paragraphs.`,
    prompt: `Project: ${input.projectTitle}
${input.description ? `Description: ${input.description}\n` : ""}
${input.currentDraft ? `Full concept document:\n${input.currentDraft}` : "No concept document provided — please provide a document to summarise."}

${input.instructions ? `Additional instructions: ${input.instructions}\n\n` : ""}Write the executive summary using the SCR structure. Cover all five areas below in approximately 300–400 words:

**Situation** — The client's current environment and the context for this engagement.
**Complication** — The challenge or gap that makes action necessary.
**Approach** — What Dataciders proposes to do, at a high level.
**Key Deliverables** — The main outputs the client will receive.
**Expected Outcome & Next Steps** — The measurable business value and the immediate action required to move forward.`,
  });
}
