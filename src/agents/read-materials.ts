import { streamText } from "ai";
import { AgentModels } from "@/lib/models";
import type { AgentInput } from "./types";

export function runReadMaterialsAgent(input: AgentInput) {
  const lang = input.language === "DE" ? "German" : "English";

  return streamText({
    model: AgentModels["read-materials"],
    system: `You are a senior consultant at Dataciders GmbH, a data & AI consulting firm.
Your task is to carefully read and analyse source documents provided by the user.
Produce your output in ${lang}.
Be concise, structured, and factually precise — do not add information not present in the materials.`,
    prompt: `Project: ${input.projectTitle}
${input.description ? `Description: ${input.description}\n` : ""}
Source materials:
${input.sourceMaterials}

${input.instructions ? `Additional instructions: ${input.instructions}\n\n` : ""}Analyse the source materials and produce a structured brief with the following sections:

1. **Key Facts** — The most important facts, figures, and context from the materials.
2. **Client Needs & Goals** — What the client wants to achieve.
3. **Constraints & Risks** — Budget, timeline, technical, regulatory, or organisational constraints.
4. **Open Questions** — Questions that remain unanswered and need clarification before work begins.
5. **Recommended Focus Areas** — Based on the materials, which topics should the concept prioritise?`,
  });
}
