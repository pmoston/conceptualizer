import { createAnthropic } from "@ai-sdk/anthropic";
import { createOllama } from "ollama-ai-provider";
import type { LanguageModel } from "ai";

// --- Providers ---

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const ollama = createOllama({
  baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/api",
});

// --- Available models ---

export const Models = {
  // Claude API
  CLAUDE_OPUS: anthropic("claude-opus-4-6") as LanguageModel,
  CLAUDE_SONNET: anthropic("claude-sonnet-4-6") as LanguageModel,
  CLAUDE_HAIKU: anthropic("claude-haiku-4-5-20251001") as LanguageModel,
  // Ollama (local)
  OLLAMA_LLAMA: ollama("llama3.2") as unknown as LanguageModel,
  OLLAMA_MISTRAL: ollama("mistral") as unknown as LanguageModel,
};

// --- Per-agent model assignment ---
// Change the value for any agent to switch its model.

export const AgentModels: Record<string, LanguageModel> = {
  "read-materials": Models.CLAUDE_OPUS,
  "draft": Models.CLAUDE_OPUS,
  "fact-check": Models.CLAUDE_OPUS,
  "humanize": Models.CLAUDE_OPUS,
  "corporate-design-review": Models.CLAUDE_OPUS,
  "translate": Models.CLAUDE_OPUS,
  "executive-summary": Models.CLAUDE_OPUS,
  "qa-checklist": Models.CLAUDE_OPUS,
};

export type AgentName = keyof typeof AgentModels;
