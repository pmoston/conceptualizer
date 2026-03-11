import { streamText } from "ai";
import { AgentModels } from "@/lib/models";
import type { AgentInput } from "./types";

export function runTranslateAgent(input: AgentInput) {
  const targetLang = input.language === "DE" ? "English" : "German";
  const sourceLang = input.language === "DE" ? "German" : "English";

  return streamText({
    model: AgentModels["translate"],
    system: `You are a professional translator and consultant at Dataciders GmbH, a data & AI consulting firm.
Translate the provided document from ${sourceLang} to ${targetLang}.
Preserve all formatting, structure, headings, and emphasis exactly.
Use natural, professional consulting language in the target language — not a literal word-for-word translation.
Industry-specific terms should be translated accurately; retain proper nouns (company names, product names) as-is.`,
    prompt: `Project: ${input.projectTitle}

${input.currentDraft ? `Document to translate (${sourceLang} → ${targetLang}):\n${input.currentDraft}` : `No document provided — please provide a document to translate from ${sourceLang} to ${targetLang}.`}

${input.instructions ? `Additional instructions: ${input.instructions}\n\n` : ""}Provide the complete translated document in ${targetLang}.`,
  });
}
