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

Translation principles:
- Preserve all formatting, section headings, numbered lists, bold/italic emphasis, and document structure exactly.
- Aim for natural, professional consulting language in ${targetLang} — not a literal word-for-word translation.
- Consulting idioms and phrases should be rendered using the natural equivalent in the target language, not calqued literally.
- Industry-specific technical terms: translate accurately; include the original term in parentheses the first time if the target-language equivalent is not universally established.
- Proper nouns: retain company names, product names, and trademarks exactly (e.g. "Dataciders GmbH" stays unchanged).
- Numbers, dates, and units: convert to the target locale format where applicable (e.g. decimal separator, date format).
- Do not add commentary, translator notes, or explanations — output the translated document only.`,
    prompt: `Project: ${input.projectTitle}

${input.currentDraft
  ? `Document to translate (${sourceLang} → ${targetLang}):\n${input.currentDraft}`
  : `No document provided — please provide a document to translate from ${sourceLang} to ${targetLang}.`}

${input.instructions ? `Additional instructions: ${input.instructions}\n\n` : ""}Provide the complete translated document in ${targetLang}.`,
  });
}
