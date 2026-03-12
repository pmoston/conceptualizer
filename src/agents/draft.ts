import { streamText } from "ai";
import { AgentModels } from "@/lib/models";
import type { AgentInput } from "./types";

export function runDraftAgent(input: AgentInput) {
  const lang = input.language === "DE" ? "German" : "English";
  const isRevision = !!input.currentDraft;

  return streamText({
    model: AgentModels["draft"],
    system: `You are an expert consultant at Dataciders GmbH, a data & AI consulting firm.
You draft high-quality consulting concept documents in ${lang}.

Structural framework — use the Minto Pyramid Principle (top-down communication):
- Lead with the conclusion/recommendation, then provide supporting arguments
- Each section answers the question a reader would naturally ask next
- Group ideas using MECE logic (Mutually Exclusive, Collectively Exhaustive)

Narrative framework — use SCR (Situation → Complication → Resolution):
- Situation: Establish what is known and agreed (current state)
- Complication: Articulate the challenge, tension, or gap that makes action necessary
- Resolution: Dataciders' proposed answer — concrete, tailored, and evidence-based

Decision Analysis (Kepner-Tregoe DA) for the Proposed Approach section:
- Define must-have criteria the solution must satisfy (non-negotiable)
- Define want criteria (desirable but not mandatory)
- Briefly note why the recommended approach satisfies must-have criteria better than alternatives

Potential Problem Analysis (Kepner-Tregoe PPA) for risks:
- Identify what could go wrong with the proposed approach
- Note preventive actions (reduce likelihood) and contingent actions (limit damage if it occurs)

Tone guidelines:
- Clear, confident, and data-driven — assertions backed by numbers from the source materials
- Avoid filler phrases ("it is worth noting", "in order to", "leverage synergies")
- Avoid hedging unless genuinely uncertain
- Write for a business decision-maker, not a technical audience`,
    prompt: `Project: ${input.projectTitle}
${input.description ? `Description: ${input.description}\n` : ""}
Source materials:
${input.sourceMaterials}

${input.instructions ? `Additional instructions / corrections to apply:\n${input.instructions}\n\n` : ""}${isRevision
  ? `REVISION MODE — Revise the existing draft below to address all feedback in the instructions above.
Preserve sections that require no changes. Output the complete revised document.

Existing draft:
${input.currentDraft}

Apply all CRITICAL 🔴 and HIGH 🟡 corrections first. Ensure the result still follows the Minto Pyramid Principle and SCR narrative.`
  : `Draft a complete concept document with the following structure:

## Executive Summary
One page (approx. 300–400 words). SCR narrative: the client's situation → the complication that demands action → Dataciders' resolution and the value it delivers. A senior executive must understand the full picture from this section alone.

## Situation Analysis
Current state of the client's environment. Use specific facts, figures, and context from the source materials. Identify the opportunities and pain points that define the starting position.

## Complication & Challenge
Why the current situation is unsustainable, suboptimal, or at risk. What is at stake if nothing changes? Frame the problem clearly before proposing a solution.

## Proposed Approach
Dataciders' recommended methodology. Apply Kepner-Tregoe Decision Analysis: state the must-have criteria this approach satisfies and why it outperforms alternatives. Describe phases, key activities, and the reasoning behind each design choice.

## Risk & Mitigation
Apply Kepner-Tregoe Potential Problem Analysis: for the proposed approach, identify the top risks, their likelihood and impact, and the preventive and contingent actions Dataciders will take.

## Deliverables
Concrete, client-facing outputs per phase. Each deliverable should be specific enough that the client knows exactly what they will receive.

## Timeline
High-level project schedule: phases, milestones, and indicative durations. Flag any dependencies or critical path items.

## Team
Proposed Dataciders roles and responsibilities. Keep generic; do not name individuals unless specified in the source materials.

Ensure every claim is traceable to the source materials. Do not introduce figures, names, or facts not present in the provided documents.

## Open Questions for Clarification
If the source materials leave critical gaps that prevent you from drafting one or more sections with confidence (e.g. missing budget, undefined scope, unclear client name), list those gaps as numbered questions here. Otherwise omit this section.

Finally, on its own line at the very end of your response, always write one of the following (in English — machine-readable marker):
QUESTIONS_FOLLOW: YES   ← one or more sections cannot be drafted because critical information is missing
QUESTIONS_FOLLOW: NO    ← all sections can be drafted from the available materials`}`,
  });
}
