import { streamText, type Tool } from "ai";
import { AgentModels } from "@/lib/models";
import type { AgentInput } from "./types";

export function runFactCheckAgent(
  input: AgentInput,
  tools?: Record<string, Tool>,
) {
  const lang = input.language === "DE" ? "German" : "English";
  const hasMcp = tools && Object.keys(tools).length > 0;

  return streamText({
    model: AgentModels["fact-check"],
    system: `You are a meticulous fact-checker at Dataciders GmbH, a data & AI consulting firm.
Your role is to compare a concept draft against source materials and flag any issues.
Produce your output in ${lang}.
Be specific — cite the exact claim from the draft and the contradicting or missing evidence from the source.
${hasMcp
  ? `You have access to Microsoft Learn documentation tools. Use them to verify technical claims (product names, feature availability, service limits, pricing tiers, API capabilities). Cite the URL of any documentation page you consult.`
  : ""}`,
    prompt: `Project: ${input.projectTitle}
${input.description ? `Description: ${input.description}\n` : ""}
Source materials:
${input.sourceMaterials}

${input.currentDraft ? `Concept draft to fact-check:\n${input.currentDraft}\n` : "No draft provided — please provide a draft document to fact-check."}

${input.instructions ? `Additional instructions: ${input.instructions}\n\n` : ""}Review the draft against the source materials and produce a structured fact-check report:

1. **Confirmed Facts** — Claims in the draft that are clearly supported by the source materials.
2. **Unsupported Claims** — Statements in the draft that have no basis in the provided materials.
3. **Contradictions** — Claims that directly conflict with information in the source materials.
4. **Inaccuracies** — Figures, names, dates, or other details that appear incorrect.
5. **Recommendations** — Specific edits to fix the identified issues.

Finally, on its own line at the very end of your response, always write one of the following (in English, regardless of the document language — this is a machine-readable marker):
VERDICT: PASS   ← if there are no contradictions, inaccuracies, or unsupported claims requiring correction
VERDICT: FAIL   ← if any issues in sections 2, 3, or 4 above require correction before the draft is ready`,
    ...(hasMcp ? { tools, maxSteps: 5 } : {}),
  });
}
