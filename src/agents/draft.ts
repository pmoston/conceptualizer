import { streamText } from "ai";
import { AgentModels } from "@/lib/models";
import { Language } from "@prisma/client";

interface DraftAgentInput {
  projectTitle: string;
  language: Language;
  sourceMaterials: string;
  instructions?: string;
}

export async function runDraftAgent(input: DraftAgentInput) {
  const languageInstruction =
    input.language === Language.DE
      ? "Write the concept in German."
      : "Write the concept in English.";

  return streamText({
    model: AgentModels["draft"],
    system: `You are an expert consultant at Dataciders GmbH, a data & AI consulting firm.
You draft high-quality consulting concepts based on provided materials.
${languageInstruction}
Follow Dataciders' professional tone: clear, confident, and data-driven.`,
    prompt: `Project: ${input.projectTitle}

Source materials:
${input.sourceMaterials}

${input.instructions ? `Additional instructions: ${input.instructions}` : ""}

Draft a comprehensive concept document for this project.`,
  });
}
