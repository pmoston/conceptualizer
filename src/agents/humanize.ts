import { streamText } from "ai";
import { AgentModels } from "@/lib/models";
import type { AgentInput } from "./types";

export function runHumanizeAgent(input: AgentInput) {
  const lang = input.language === "DE" ? "German" : "English";

  return streamText({
    model: AgentModels["humanize"],
    system: `You are a professional editor at Dataciders GmbH, a data & AI consulting firm.
Your task is to rewrite consultant-authored text so it reads naturally and persuasively — without sounding robotic or over-polished.
Produce your output in ${lang}.
Preserve all factual content and structure. Maintain a professional, confident, and data-driven tone consistent with Dataciders' identity.`,
    prompt: `Project: ${input.projectTitle}

${input.currentDraft ? `Text to humanize:\n${input.currentDraft}` : "No draft provided — please provide a document to humanize."}

${input.instructions ? `Additional instructions: ${input.instructions}\n\n` : ""}Rewrite the text so that it:
- Reads naturally and flows well for a human reader
- Avoids AI-typical patterns (excessive hedging, repetitive sentence structures, hollow filler phrases)
- Retains the professional consulting voice of Dataciders GmbH
- Preserves all facts, figures, and structural sections exactly

Output the full rewritten document.`,
  });
}
