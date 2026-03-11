import { streamText } from "ai";
import { AgentModels } from "@/lib/models";
import type { AgentInput } from "./types";

export function runQaChecklistAgent(input: AgentInput) {
  const lang = input.language === "DE" ? "German" : "English";

  return streamText({
    model: AgentModels["qa-checklist"],
    system: `You are a quality assurance lead at Dataciders GmbH, a data & AI consulting firm.
Your task is to produce a practical QA checklist for a concept document before it is delivered to the client.
Produce the checklist in ${lang}.
Each item must be actionable and clearly state what needs to be verified or corrected.`,
    prompt: `Project: ${input.projectTitle}
${input.description ? `Description: ${input.description}\n` : ""}
Source materials:
${input.sourceMaterials}

${input.currentDraft ? `Concept draft:\n${input.currentDraft}\n` : "No draft provided — generate a general pre-delivery QA checklist for a consulting concept."}

${input.instructions ? `Additional instructions: ${input.instructions}\n\n` : ""}Produce a QA checklist grouped into the following categories. For each item, mark it as [ ] (unchecked):

**Content & Accuracy**
- All claims traceable to source materials
- No unsupported assumptions
- Figures, dates, and names verified

**Structure & Completeness**
- All required sections present (executive summary, situation, approach, deliverables, timeline, team)
- Logical flow between sections
- No orphaned headings or placeholder text

**Language & Tone**
- Consistent Dataciders tone throughout
- No language mixing
- Spelling and grammar reviewed

**Client Specifics**
- Client name used correctly and consistently
- Deliverables aligned with client expectations from source materials
- Open questions addressed or explicitly flagged

**Formal Requirements**
- Document formatted for delivery
- Version and date included
- Contact details correct`,
  });
}
