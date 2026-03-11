import { streamText } from "ai";
import { AgentModels } from "@/lib/models";
import type { AgentInput } from "./types";

export function runDraftAgent(input: AgentInput) {
  const lang = input.language === "DE" ? "German" : "English";

  return streamText({
    model: AgentModels["draft"],
    system: `You are an expert consultant at Dataciders GmbH, a data & AI consulting firm.
You draft high-quality consulting concepts based on provided materials.
Write the concept in ${lang}.
Follow Dataciders' professional tone: clear, confident, and data-driven.`,
    prompt: `Project: ${input.projectTitle}
${input.description ? `Description: ${input.description}\n` : ""}
Source materials:
${input.sourceMaterials}

${input.instructions ? `Additional instructions: ${input.instructions}\n\n` : ""}Draft a comprehensive concept document for this project with the following structure:

1. **Executive Summary** — One-page overview of the situation, approach, and expected outcome.
2. **Situation Analysis** — Current state, challenges, and opportunities.
3. **Proposed Approach** — Methodology, phases, and activities.
4. **Deliverables** — Concrete outputs for each phase.
5. **Timeline** — High-level project schedule.
6. **Team** — Proposed Dataciders team roles and responsibilities.`,
  });
}
