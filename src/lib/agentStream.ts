// Shared stream event protocol between the API route and the client.
// The server sends newline-delimited JSON; each line is one StreamEvent.

export type StepKind =
  | "info"
  | "agent_call"
  | "agent_output"
  | "tool_call"
  | "tool_result"
  | "warning"
  | "error";

export type StreamEvent =
  | { t: "step"; kind: StepKind; label: string; content?: string }
  | { t: "delta"; text: string }
  | { t: "done"; runId: string }
  | { t: "err"; message: string };

export function encode(event: StreamEvent): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(event) + "\n");
}
