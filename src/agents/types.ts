import { Language } from "@prisma/client";

export interface AgentInput {
  projectTitle: string;
  language: Language;
  description?: string | null;
  sourceMaterials: string;
  currentDraft?: string | null;
  instructions?: string | null;
}
