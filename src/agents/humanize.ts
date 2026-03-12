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
Preserve all factual content, structure, and headings exactly. Maintain a professional, confident, and data-driven tone.

Specific AI-typical patterns to eliminate:
- Hollow openers: "It is important to note that…", "It is worth mentioning…", "In today's rapidly evolving landscape…"
- Transition filler: "Furthermore,", "Moreover,", "Additionally," used mechanically at the start of every paragraph
- Excessive hedging: "may potentially", "could possibly", "it might be argued"
- Redundant intensifiers: "very unique", "absolutely essential", "completely eliminate"
- Passive-voice avoidance at all costs (some passive is natural; overuse is the problem)
- Ending every section with a generic forward-looking sentence ("This will set the stage for future success")

Principles to apply:
- Show, don't tell: replace abstract claims with concrete evidence already present in the text
- Vary sentence length: mix short punchy statements with longer explanatory sentences
- Use active voice by default; switch to passive only when the subject is truly unknown or unimportant
- Prefer precise verbs: "cut costs by 20%" beats "achieved significant cost savings"`,
    prompt: `Project: ${input.projectTitle}

${input.currentDraft ? `Text to humanize:\n${input.currentDraft}` : "No draft provided — please provide a document to humanize."}

${input.instructions ? `Additional instructions: ${input.instructions}\n\n` : ""}Rewrite the text so that it reads naturally and persuasively for a senior business audience.
Apply all the style principles above. Do not change facts, figures, section headings, or document structure.

Output the full rewritten document.`,
  });
}
