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
  // Claude API (production quality, requires ANTHROPIC_API_KEY)
  CLAUDE_OPUS:   anthropic("claude-opus-4-6")            as LanguageModel,
  CLAUDE_SONNET: anthropic("claude-sonnet-4-6")          as LanguageModel,
  CLAUDE_HAIKU:  anthropic("claude-haiku-4-5-20251001")  as LanguageModel,

  // Ollama — local models on M1 Max 64 GB
  // gpt-oss:20b  (13 GB) — best quality for drafting/analysis/review; ~20-30 tok/s
  // deepseek-r1:8b (4.9 GB) — reasoning model; ideal for fact-checking; ~40-55 tok/s
  // llama3.1:8b  (4.9 GB) — solid instruction-following for structured tasks; ~40-55 tok/s
  // mistral:latest (4.1 GB) — fast general purpose; ~45-60 tok/s
  // llama3.2:latest (2.0 GB) — lightweight only, limited reasoning
  OLLAMA_GPT_OSS_20B:       ollama("gpt-oss:20b")        as unknown as LanguageModel,
  OLLAMA_DEEPSEEK_R1_8B:    ollama("deepseek-r1:8b")     as unknown as LanguageModel,
  OLLAMA_LLAMA31_8B:        ollama("llama3.1:8b")         as unknown as LanguageModel,
  OLLAMA_MISTRAL:           ollama("mistral")             as unknown as LanguageModel,
  OLLAMA_LLAMA32:           ollama("llama3.2")            as unknown as LanguageModel,
};

// --- Per-agent model assignment ---
// Local Ollama models are used by default.
// Set USE_CLOUD_MODELS=true in .env / .env.local to switch to Claude API instead.
// All listed Ollama models run comfortably on an M1 Max 64 GB (max model: 13 GB).

const LOCAL = process.env.USE_CLOUD_MODELS !== "true";

export const AgentModels: Record<string, LanguageModel> = {
  // Deep comprehension of complex source docs → Opus / largest local model
  "read-materials":          LOCAL ? Models.OLLAMA_GPT_OSS_20B    : Models.CLAUDE_OPUS,
  // Long-form structured writing, highest-stakes output → Opus
  "draft":                   LOCAL ? Models.OLLAMA_GPT_OSS_20B    : Models.CLAUDE_OPUS,
  // Chain-of-thought reasoning to catch subtle contradictions → Opus / deepseek-r1
  "fact-check":              LOCAL ? Models.OLLAMA_DEEPSEEK_R1_8B : Models.CLAUDE_OPUS,
  // Stylistic sensitivity and writing quality → Sonnet sweet spot
  "humanize":                LOCAL ? Models.OLLAMA_GPT_OSS_20B    : Models.CLAUDE_SONNET,
  // Nuanced brand/style pattern-matching → Sonnet sufficient
  "corporate-design-review": LOCAL ? Models.OLLAMA_GPT_OSS_20B    : Models.CLAUDE_SONNET,
  // High-quality DE↔EN translation → Sonnet handles this very well
  "translate":               LOCAL ? Models.OLLAMA_GPT_OSS_20B    : Models.CLAUDE_SONNET,
  // Clear structured summarisation → Sonnet more than enough
  "executive-summary":       LOCAL ? Models.OLLAMA_LLAMA31_8B     : Models.CLAUDE_SONNET,
  // Defined format, short structured output → Haiku's sweet spot
  "qa-checklist":            LOCAL ? Models.OLLAMA_LLAMA31_8B     : Models.CLAUDE_HAIKU,
};

export type AgentName = keyof typeof AgentModels;
