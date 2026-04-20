#!/usr/bin/env node

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { callToolApi } from "./api-client.js";
import { z } from "zod";

const server = new McpServer({
  name: "promptibus",
  version: "0.2.0",
  description:
    "Model intelligence for AI agents — syntax, parameters, and routing for 67+ generative AI models via Promptibus",
});

console.error("Promptibus MCP server starting (API client mode)");

const tools = [
  {
    name: "recommend_model",
    description:
      "Recommend the best AI model for a task. Returns top 3 models with reasoning, parameters, and links.",
    schema: {
      task: z.string().min(1).max(1000).describe("Description of what you want to generate"),
      domain: z.string().max(10).optional().describe("Filter: IMAGE, VIDEO, TEXT, CODE, or AUDIO"),
      constraints: z.string().max(500).optional().describe("Budget, speed, quality constraints"),
    },
  },
  {
    name: "format_prompt",
    description:
      "Format and optimize a prompt for a specific AI model. Applies model-specific syntax and parameters.",
    schema: {
      text: z.string().min(1).max(50000).describe("The raw prompt text to format"),
      model: z.string().min(1).max(100).describe("Model slug (e.g., midjourney-v7, flux-2-pro)"),
    },
  },
  {
    name: "validate_prompt",
    description:
      "Validate a prompt against a model's rules. Finds errors like deprecated flags or exceeded limits.",
    schema: {
      prompt: z.string().min(1).max(50000).describe("The prompt text to validate"),
      model: z.string().min(1).max(100).describe("Model slug to validate against"),
    },
  },
  {
    name: "compare_models",
    description: "Compare 2-5 AI models side-by-side on provider, domain, cost, and capabilities.",
    schema: {
      models: z.array(z.string().min(1).max(100)).min(2).max(5).describe("Model slugs to compare"),
      criteria: z.string().max(500).optional().describe("Focus criteria (e.g., photorealism, speed, price)"),
    },
  },
  {
    name: "get_parameters",
    description:
      "Get recommended parameters for a model, including defaults, ranges, and community-tested configs.",
    schema: {
      model: z.string().min(1).max(100).describe("Model slug (e.g., midjourney-v7, flux-2-pro)"),
      task_type: z.string().max(100).optional().describe("Task type (e.g., portrait, landscape, product-photo)"),
    },
  },
  {
    name: "get_model_profile",
    description:
      "Get a complete model profile: capabilities, syntax guide, parameters, community tips, and related prompts.",
    schema: {
      model: z.string().min(1).max(100).describe("Model slug (e.g., midjourney-v7, flux-2-pro, suno-v4)"),
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
