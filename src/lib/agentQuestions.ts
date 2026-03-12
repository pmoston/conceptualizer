/**
 * Extract numbered questions from agent output text.
 *
 * Agents that support user dialogue end their output with a clearly
 * delimited section (e.g. "## Open Questions") containing a numbered list,
 * followed by the machine-readable QUESTIONS_FOLLOW marker.
 *
 * This utility extracts those numbered items so the UI can render
 * per-question input fields instead of a single free-text textarea.
 */
export function parseQuestions(text: string): string[] {
  const lines = text.split("\n");
  const questions: string[] = [];
  let inQuestionsSection = false;

  for (const raw of lines) {
    const line = raw.trim();

    // Stop at the machine-readable marker
    if (/^QUESTIONS_FOLLOW:/i.test(line)) break;

    // Enter the questions section on a matching heading
    if (/^#{1,4}\s*(open\s+questions|questions\s+for\s+clarification|clarifying\s+questions)/i.test(line)) {
      inQuestionsSection = true;
      continue;
    }

    // Leave on the next section heading
    if (inQuestionsSection && /^#{1,4}\s/.test(line)) {
      inQuestionsSection = false;
    }

    if (inQuestionsSection) {
      // Match "1. question", "1) question", "- question" (after entering section)
      const numbered = line.match(/^\d+[.)]\s+(.+)/);
      if (numbered) {
        questions.push(numbered[1].trim());
        continue;
      }
      const bulleted = line.match(/^[-*]\s+(.+)/);
      if (bulleted) {
        questions.push(bulleted[1].trim());
      }
    }
  }

  return questions;
}

/**
 * Build a structured answer string from per-question answers.
 * Used when posting to the reply endpoint.
 */
export function buildAnswerPayload(questions: string[], answers: string[]): string {
  if (questions.length === 0) return answers[0] ?? "";
  return questions
    .map((q, i) => `${i + 1}. ${q}\n   Answer: ${(answers[i] ?? "").trim() || "(no answer provided)"}`)
    .join("\n\n");
}
