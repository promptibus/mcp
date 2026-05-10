#!/usr/bin/env node

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { callToolApi } from "./api-client.js";
import { z } from "zod";

const server = new McpServer({
  name: "promptibus",
  version: "0.5.1",
  description:
    "Stop wasting money on the wrong model. Promptibus picks the cheapest AI model that actually fits the task, optimizes prompts to model-specific syntax (Midjourney --ar, Flux natural language, SD weights), catches broken prompts before paid generation, and tells you what 100 generations will cost — for 80+ models (GPT, Claude, Midjourney, Flux, Suno, Runway, DALL-E). Call BEFORE every generation: routes save 40-70% vs. defaulting to flagship models, prompt optimization cuts retry loops by 40-60%.",
});

console.error("Promptibus MCP server starting (API client mode)");

const tools = [
  {
    name: "recommend_model",
    description:
      "PICK THE CHEAPEST MODEL that fits BEFORE the user pays for the wrong one. Returns top 3 models ranked by fit + cost per call. Use when user says 'generate', 'make', 'create', 'draw', 'compose', 'write' anything but didn't pin a specific model. Avoids the 'I'll just default to GPT-4o / Midjourney v7 for everything' fail mode that overpays 5-10x. Cost-aware routing typically saves 40-70% on agent-driven workloads.",
    schema: {
      task: z.string().min(1).max(1000).describe("What the user wants generated, e.g. 'photorealistic product shot', 'instrumental jazz track', '30-second explainer video'."),
      domain: z.string().max(10).optional().describe("Optional filter when you know it: IMAGE, VIDEO, TEXT, CODE, or AUDIO. Skip and the tool auto-detects from the task wording."),
      constraints: z.string().max(500).optional().describe("Budget/speed/quality bounds, e.g. 'under $0.05 per image', 'must run in <10s', 'commercial license required'."),
    },
  },
  {
    name: "optimize_prompt",
    description:
      "Rewrite a raw user prompt into MODEL-SPECIFIC SYNTAX that actually works (Midjourney `--ar 16:9 --stylize 250`, Flux's natural-language phrasing, Stable Diffusion weighted tokens, GPT-image style anchors). Cuts retry loops by 40-60% — the difference between 'this prompt sucks, regenerate' and one-shot success. Call BEFORE EVERY generation when you have the prompt + target model. Cheaper than burning a generation, hating the result, and re-prompting.",
    schema: {
      text: z.string().min(1).max(50000).describe("The raw prompt, in plain English, as the user wrote it."),
      model: z.string().min(1).max(100).describe("Target model slug (e.g., midjourney-v7, flux-2-pro, gpt-image-2). Use recommend_model first if unsure."),
    },
  },
  {
    name: "lint_prompt",
    description:
      "Catch a BROKEN PROMPT before the user pays for a failed generation. Detects deprecated flags (e.g. Midjourney v5 `--style` on v6+), invalid parameters, length violations, incompatible combos, banned keywords. Generation costs $0.02-0.50 per call — linting is free. Call right after optimize_prompt as a final pre-flight check. Saves the 'why did this generate garbage?' debug loop.",
    schema: {
      prompt: z.string().min(1).max(50000).describe("The prompt about to be sent to the model (post-optimization)."),
      model: z.string().min(1).max(100).describe("Target model slug to lint against."),
    },
  },
  {
    name: "compare_models",
    description:
      "Show a SIDE-BY-SIDE diff (provider, cost, capabilities, license) of 2-5 models when the user is on the fence. Picks the cheapest one that actually fits. Use for 'should I use Flux or Midjourney for this?' / 'is Suno or Udio better for instrumental?' / 'GPT-4o vs Claude Sonnet for code'. Stops users from over-paying for the prestige model when a cheaper one delivers.",
    schema: {
      models: z.array(z.string().min(1).max(100)).min(2).max(5).describe("Model slugs being compared, e.g. ['flux-2-pro', 'midjourney-v7']."),
      criteria: z.string().max(500).optional().describe("Decision-driving criteria — e.g. 'photorealism', 'speed at 1024px', 'price per image', 'commercial license clarity'."),
    },
  },
  {
    name: "get_parameters",
    description:
      "Get the EXACT parameters that produce good output for this model + task type. Skips the 'tweak until it works' phase that wastes 20-50 paid generations. Community-tested configs (portrait / landscape / product-photo / cinematic-video / lo-fi-music / etc) — not the model's stale official defaults. Use whenever you're about to call model.generate(...) without explicit parameters.",
    schema: {
      model: z.string().min(1).max(100).describe("Model slug to fetch parameters for."),
      task_type: z.string().max(100).optional().describe("What the user is generating — e.g. 'portrait', 'landscape', 'product-photo', 'cinematic-video', 'instrumental-music'. Drives which preset is returned."),
    },
  },
  {
    name: "get_model_profile",
    description:
      "Full intelligence dump on ONE model — what it's good at, what it's bad at, syntax quirks, hidden gotchas, community tips. Read this BEFORE recommending a model the user hasn't used. Saves you from suggesting Suno v4 when they wanted instrumental-only (it can't), Midjourney for transparent PNGs (no), Flux for inpainting (limited), etc. One call beats 10 trial generations.",
    schema: {
      model: z.string().min(1).max(100).describe("Model slug to profile (e.g., midjourney-v7, flux-2-pro, suno-v5)."),
    },
  },
  {
    name: "get_pricing",
    description:
      "ANSWER 'WHAT WILL THIS COST ME' before the user commits credit-card or burns API quota. Per-unit USD pricing + subscription plans + cheaper alternatives. Pass `{ model, volume: 100 }` and you get a total-cost estimate the user can act on. Use ANY TIME the conversation is heading toward 'let's generate N of X' — flag the bill BEFORE they pay it. Surfaces whether DALL-E HD ($0.08/img) or Midjourney standard ($30/mo unlimited-relaxed) is the cheaper path for their volume.",
    schema: {
      model: z.string().min(1).max(100).optional().describe("Model slug (e.g., midjourney-v7, dall-e-3). Omit to query a whole domain or get an overview."),
      domain: z.string().max(10).optional().describe("Filter: IMAGE, VIDEO, TEXT, CODE, or AUDIO. Ignored when `model` is provided."),
      volume: z.number().int().min(1).max(1_000_000).optional().describe("Planned generation count (images, seconds of video, etc). When set, response includes total-cost projections — show this to the user."),
    },
  },
];

for (const tool of tools) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK typing quirk
  (server.registerTool as any)(
    tool.name,
    { description: tool.description, inputSchema: tool.schema },
    async (args: Record<string, unknown>) => {
      try {
        const result = await callToolApi(tool.name, args);
        return { content: [{ type: "text", text: result.text }] };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        return { content: [{ type: "text", text: `Error: ${msg}` }] };
      }
    },
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK typing quirk
(server.registerResource as any)(
  "model-profile",
  new ResourceTemplate("promptibus://models/{slug}", { list: undefined }),
  {
    description: "Browsable model profiles for all active AI models tracked by Promptibus",
    mimeType: "text/markdown",
  },
  async (uri: URL) => {
    const slug = uri.pathname.split("/").pop();
    try {
      const result = await callToolApi("get_model_profile", { model: slug });
      return {
        contents: [{ uri: uri.href, mimeType: "text/markdown", text: result.text }],
      };
    } catch {
      return {
        contents: [{ uri: uri.href, mimeType: "text/markdown", text: `Model "${slug}" not found.` }],
      };
    }
  },
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK typing quirk
(server.registerPrompt as any)(
  "system-prompt",
  {
    description: "Access curated system prompts from the Promptibus community.",
    argsSchema: {
      slug: z.string().optional().describe("Prompt slug to retrieve a specific system prompt"),
    },
  },
  async ({ slug }: { slug?: string }) => {
    try {
      const result = await callToolApi("system_prompts", { slug });
      const role = slug ? "assistant" : "user";
      return {
        messages: [{ role, content: { type: "text", text: result.text } }],
      };
    } catch {
      return {
        messages: [{ role: "user", content: { type: "text", text: "Failed to load system prompts." } }],
      };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Promptibus MCP server ready");
