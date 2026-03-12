import { streamText } from "ai";
import { AgentModels } from "@/lib/models";
import type { AgentInput } from "./types";

export function runQaChecklistAgent(input: AgentInput) {
  const lang = input.language === "DE" ? "German" : "English";

  return streamText({
    model: AgentModels["qa-checklist"],
    system: `You are a quality assurance lead at Dataciders GmbH, a data & AI consulting firm.
Produce a practical, draft-specific QA checklist for a concept document before it is delivered to the client.
Produce the checklist in ${lang}.
Each item must be actionable and reference a specific section or claim in the document where relevant.
Where the draft fails a check, add a short note — e.g.: "[ ] Executive Summary present — ⚠️ MISSING"`,
    prompt: `Project: ${input.projectTitle}
${input.description ? `Description: ${input.description}\n` : ""}
Source materials:
${input.sourceMaterials}

${input.currentDraft ? `Concept draft:\n${input.currentDraft}\n` : "No draft provided — generate a general pre-delivery QA checklist for a consulting concept."}

${input.instructions ? `Additional instructions: ${input.instructions}\n\n` : ""}Review the draft against the source materials and produce a QA checklist. Mark each item as [ ] (to check) or [x] (confirmed). Add ⚠️ and a brief note for any item that clearly fails.

**Content & Accuracy**
- [ ] All figures, dates, and names match the source materials exactly
- [ ] No claims without a traceable source in the provided materials
- [ ] No unsupported assumptions presented as facts
- [ ] Contradictions between draft and source materials resolved

**Structure & Completeness**
- [ ] Executive Summary present and self-contained (SCR narrative)
- [ ] Situation Analysis present
- [ ] Complication / Challenge section present
- [ ] Proposed Approach present with methodology rationale
- [ ] Deliverables section — concrete, phase-specific outputs listed
- [ ] Timeline present with phases and milestones
- [ ] Team section present
- [ ] No orphaned headings or placeholder text (e.g. "[TBD]", "Lorem ipsum")
- [ ] Logical flow between sections (each section answers the question the previous one raises)

**Language & Tone**
- [ ] Consistent Dataciders tone throughout (clear, confident, data-driven)
- [ ] No AI filler phrases (e.g. "it is worth noting", "in today's rapidly evolving landscape")
- [ ] No language mixing — document is entirely in ${lang}
- [ ] Spelling and grammar reviewed
- [ ] No passive-voice overuse (more than two consecutive passive constructions in a paragraph)

**Client Specifics**
- [ ] Client name used correctly and consistently throughout
- [ ] "Dataciders GmbH" on first mention; "Dataciders" on subsequent mentions
- [ ] Deliverables aligned with client expectations stated in source materials
- [ ] Open questions from Read Materials brief addressed or explicitly flagged as out of scope

**Formal Requirements**
- [ ] Document title and project name correct
- [ ] Version number included (e.g. v1.0)
- [ ] Date included
- [ ] Dataciders contact details present (if required for this document type)`,
  });
}
