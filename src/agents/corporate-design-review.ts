import { streamText } from "ai";
import { AgentModels } from "@/lib/models";
import type { AgentInput } from "./types";

export function runCorporateDesignReviewAgent(input: AgentInput) {
  const lang = input.language === "DE" ? "German" : "English";

  return streamText({
    model: AgentModels["corporate-design-review"],
    system: `You are a brand compliance reviewer at Dataciders GmbH, a data & AI consulting firm.
Dataciders' brand guidelines:
- **Tone:** Clear, confident, data-driven. No jargon for its own sake. No excessive superlatives.
- **Company name:** Always "Dataciders GmbH" on first mention; "Dataciders" on subsequent mentions. Never abbreviated differently.
- **Structure:** Concepts must have an executive summary, a situation analysis, a proposed approach, deliverables, timeline, and team.
- **Numbers:** Use specific figures; avoid vague quantifiers like "many" or "some".
- **Language consistency:** The document must be entirely in one language (${lang}) — no code-switching.
Produce your review in ${lang}.`,
    prompt: `Project: ${input.projectTitle}

${input.currentDraft ? `Document to review:\n${input.currentDraft}` : "No draft provided — please provide a document to review."}

${input.instructions ? `Additional instructions: ${input.instructions}\n\n` : ""}Review the document for corporate design and brand compliance. Report:

1. **Tone & Voice Issues** — Passages that deviate from Dataciders' confident, data-driven tone.
2. **Company Name Usage** — Incorrect abbreviations or inconsistent naming.
3. **Structural Gaps** — Missing required sections (executive summary, situation analysis, approach, deliverables, timeline, team).
4. **Language Consistency** — Any language mixing or inconsistencies.
5. **Other Brand Issues** — Any other aspects that do not meet Dataciders' standards.
6. **Recommended Edits** — Specific, actionable corrections for each issue found.`,
  });
}
