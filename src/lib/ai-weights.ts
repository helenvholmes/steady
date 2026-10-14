import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

/**
 * AI progress weights (REQUIREMENTS.md, "Progress estimate", item 2). Sends only what the spec lists:
 * the goal's name and target date; each metric's name, unit, start, target, and target date; the number of
 * tasks and their titles. No notes, no entry history.
 */

export type WeightRequest = {
  goalName: string;
  targetDate: string | null;
  inputs: (
    | { key: string; kind: "metric"; name: string; unit: string; startValue: number; targetValue: number; targetDate: string }
    | { key: string; kind: "tasks"; taskCount: number; taskTitles: string[] }
    | { key: string; kind: "time" }
  )[];
};

export type WeightResult = { weights: { key: string; weight: number; reason: string }[]; summary: string | null };

const MODEL = "claude-opus-5-5";

/** A key is set on the server. Without one, the bar uses equal weights and no request is attempted. */
export function aiConfigured() {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

const SYSTEM = `You set weights for a personal goal's progress bar. The bar is a weighted average of inputs: \
each metric's progress from its start value toward its target, the share of the goal's tasks done, or the share \
of time passed. Weight each input by how much it contributes to actually reaching the goal: its size, the effort \
and time it takes, and how central it is. A large, long effort outweighs one that is small or nearly finished.

Return every input key exactly once. Weights are positive numbers that sum to 100. For each, give a reason of one \
short sentence (under 15 words) in plain language, addressed to the user, explaining why it counts that much.

Also write a summary: one or two short sentences (under 35 words in all), addressed to the user, explaining how \
the progress bar is calculated, naming which parts count most and why. Don't mention current values or how far \
along anything is; those change, and the summary is kept until the inputs change.`;

const Output = z.object({
  weights: z.array(z.object({ key: z.string(), weight: z.number(), reason: z.string() })),
  summary: z.string(),
});

export async function requestWeights(request: WeightRequest): Promise<WeightResult> {
  const client = new Anthropic();
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(Output) },
    system: SYSTEM,
    messages: [{ role: "user", content: JSON.stringify(request) }],
  });
  if (response.stop_reason === "refusal") throw new Error("Weights request was declined");
  const parsed = response.parsed_output;
  if (!parsed) throw new Error(`No weights in response (stop reason: ${response.stop_reason})`);

  // Keep only known keys, each once, with positive weights; every input must be covered.
  const wanted = new Set(request.inputs.map((i) => i.key));
  const seen = new Map<string, { weight: number; reason: string }>();
  for (const w of parsed.weights) {
    if (wanted.has(w.key) && !seen.has(w.key) && Number.isFinite(w.weight) && w.weight > 0) {
      seen.set(w.key, { weight: w.weight, reason: w.reason.trim().slice(0, 200) });
    }
  }
  if (seen.size !== wanted.size) throw new Error("Weights response didn't cover every input");
  const total = [...seen.values()].reduce((s, w) => s + w.weight, 0);
  return {
    weights: [...seen].map(([key, w]) => ({ key, weight: w.weight / total, reason: w.reason })),
    summary: parsed.summary.trim().slice(0, 300) || null,
  };
}
