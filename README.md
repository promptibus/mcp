# @promptibus/mcp

[![npm version](https://img.shields.io/npm/v/@promptibus/mcp.svg)](https://www.npmjs.com/package/@promptibus/mcp)
[![npm downloads](https://img.shields.io/npm/dm/@promptibus/mcp.svg)](https://www.npmjs.com/package/@promptibus/mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-compatible-0a7cff.svg)](https://modelcontextprotocol.io)
[![Promptibus](https://img.shields.io/badge/powered%20by-promptibus.com-0a7cff.svg)](https://promptibus.com/mcp)

> **Model intelligence for AI agents.** Syntax, parameters, pricing, and routing for 67+ generative AI models (Midjourney, Flux, Suno, Runway, DALL-E, Stable Diffusion, and more), delivered via the Model Context Protocol.

Promptibus MCP gives your AI agent structured knowledge about generative AI models: which model fits a task, how to format prompts for it, what parameters to use, what a run of 100 images will cost, and what pitfalls to avoid. It's not an API wrapper — it doesn't generate images or music. Instead, it tells your agent *how* to use the tools it already has access to.

Think of it as a prompt engineering co-pilot embedded in your agent's tool chain.

## Supported Clients

Works out of the box with any MCP-compatible client:

- **Claude Desktop** — edit `claude_desktop_config.json`
- **Claude Code** — `claude mcp add promptibus -- npx -y @promptibus/mcp`
- **Cursor** — edit `.cursor/mcp.json`
- **Windsurf** — edit `~/.codeium/windsurf/mcp_config.json`
- **Zed** — edit `settings.json` under `context_servers`
- **Continue.dev** — edit `~/.continue/config.json`
- **n8n** — MCP Client node, stdio transport
- Any other stdio MCP client

See [Client Configs](#client-configs) for per-client snippets.

## Quick Start

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "promptibus": {
      "command": "npx",
      "args": ["-y", "@promptibus/mcp"],
      "env": {
        "PROMPTIBUS_API_KEY": "psy_your_api_key_here"
      }
    }
  }
}
```

That's it. The package talks to the hosted Promptibus API — no database, no server setup.

| Variable | Required | Description |
|---|---|---|
| `PROMPTIBUS_API_KEY` | No | API key for higher rate limits and full tool access. Works anonymously without one. Get a key at [promptibus.com/settings/api-keys](https://promptibus.com/settings/api-keys) |
| `PROMPTIBUS_API_URL` | No | Override API base URL (default: `https://promptibus.com`). Useful for testing or self-hosted Promptibus instances. |

## Tools

All seven tools are available to every tier — including anonymous use without an API key. Tiering applies to rate limits and which models you can query against (see below).

| Tool | Description | Example Input |
|---|---|---|
| `recommend_model` | Find the best model for a task. Returns top 3 with reasoning and parameters. | `{ "task": "photorealistic portrait", "domain": "IMAGE" }` |
| `optimize_prompt` | Optimize a prompt for a specific model. Applies model-specific syntax, community-tested parameters, and best-practice wording. | `{ "text": "a cat in space", "model": "midjourney-v7" }` |
| `lint_prompt` | Lint a prompt against a model's rules. Finds deprecated flags, invalid parameters, or length violations, and suggests fixes. | `{ "prompt": "a cat --ar 16:9", "model": "flux-2-pro" }` |
| `compare_models` | Side-by-side comparison of 2-5 models with provider, domain, cost, and capabilities. | `{ "models": ["flux-2-pro", "midjourney-v7"], "criteria": "photorealism" }` |
| `get_parameters` | Get recommended parameters for a model, including defaults and community-tested configs. | `{ "model": "stable-diffusion-3-5", "task_type": "portrait" }` |
| `get_model_profile` | Complete model profile: capabilities, syntax guide, parameters, community tips, and related prompts. | `{ "model": "suno-v4" }` |
| `get_pricing` | Real-world USD pricing for a model, a domain, or a planned volume. Includes cheaper alternatives and total-cost estimates. | `{ "model": "dall-e-3", "volume": 100 }` |

## Resources

Model profiles are available as MCP resources at:

```
promptibus://models/{slug}
```

Each resource returns a Markdown document with the model's provider, domain, version, pricing, description, and full guide content.

## Prompts

The `system-prompt` prompt provides access to curated system prompts from the Promptibus community.

- **Without a slug**: lists all available system prompts across IMAGE, VIDEO, AUDIO, TEXT, CODE domains
- **With a slug**: returns the full prompt content, ready to use as a system message

```
# List all
system-prompt

# Get specific
system-prompt { "slug": "midjourney-prompt-architect" }
```

## Authentication

Authentication is optional but recommended. Without an API key, you get anonymous-tier access.

1. Create an account at [promptibus.com](https://promptibus.com)
2. Go to [Settings > API Keys](https://promptibus.com/settings/api-keys)
3. Generate a key (starts with `psy_`)
4. Set `PROMPTIBUS_API_KEY` in your MCP config

## Rate Limits

All tiers get access to **all 7 tools**. The difference is how many calls you get per day and which models you can query against.

| Plan | Daily Limit | Model coverage |
|---|---|---|
| Anonymous (no key) | 25 requests | 10 free-tier models |
| Free (with key) | 100 requests | 10 free-tier models |
| Pro | 500 requests | All 67+ models |
| Studio | 2,000 requests | All 67+ models |

Limits reset daily at midnight UTC. See [pricing](https://promptibus.com/pricing) for plan details.

## Caching

To keep things fast and reduce unnecessary API traffic, the client caches responses for four tools whose output changes rarely: `get_model_profile`, `get_parameters`, `compare_models`, `get_pricing`. Cache TTL is 24 hours, in-memory (per process). Cache is skipped for tools whose output is input-dependent in a way that would get stale (`recommend_model`, `optimize_prompt`, `lint_prompt`).

## Supported Models

67+ models across 5 domains:

**IMAGE** — Midjourney v7, v6.1, v6 | FLUX 2 Pro, 1.1 Pro, Dev, Schnell | Stable Diffusion 3.5, XL | DALL-E 3 | Ideogram 3 | Recraft V3 | Leonardo Phoenix | Google Imagen 3 | and more

**VIDEO** — Sora | Runway Gen-3 Alpha, Gen-4 | Kling 1.6, 2.0 | Minimax Video-01 | Pika 2.0, 2.2 | Luma Dream Machine | Hailuo | Veo 2 | and more

**AUDIO** — Suno v4, v3.5 | Udio v1.5 | ElevenLabs | Stable Audio 2.0 | and more

**TEXT** — GPT-4o | Claude 4 Sonnet | Gemini 2.5 Pro | DeepSeek V3, R1 | Llama 3.3 | and more

**CODE** — Claude 4 Sonnet | GPT-4o | Gemini 2.5 Pro | DeepSeek V3 | and more

Full list at [promptibus.com/models](https://promptibus.com/models).

## Privacy

- Your prompts and tool calls are sent to `promptibus.com` over HTTPS
- API keys are hashed server-side (SHA-256); the raw key never appears in logs
- Anonymous usage (no key) is rate-limited by IP
- No client-side DB, no local state beyond a single HTTP client

## Client Configs

### Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "promptibus": {
      "command": "npx",
      "args": ["-y", "@promptibus/mcp"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add promptibus -- npx -y @promptibus/mcp
```

### Cursor

`.cursor/mcp.json` in your project (or `~/.cursor/mcp.json` globally):

```json
{
  "mcpServers": {
    "promptibus": {
      "command": "npx",
      "args": ["-y", "@promptibus/mcp"]
    }
  }
}
```

### Windsurf

`~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "promptibus": {
      "command": "npx",
      "args": ["-y", "@promptibus/mcp"]
    }
  }
}
```

### Zed

`settings.json`:

```json
{
  "context_servers": {
    "promptibus": {
      "command": {
        "path": "npx",
        "args": ["-y", "@promptibus/mcp"]
      }
    }
  }
}
```

### Continue.dev

`~/.continue/config.json`, under `experimental.modelContextProtocolServers`:

```json
{
  "transport": {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "@promptibus/mcp"]
  }
}
```

### n8n

In the MCP Client node, set transport to **stdio**:

```
Command: npx
Arguments: -y @promptibus/mcp
```

## Links

- [Website](https://promptibus.com)
- [Models](https://promptibus.com/models)
- [API Keys](https://promptibus.com/settings/api-keys)
- [Pricing](https://promptibus.com/pricing)
- [MCP Spec](https://modelcontextprotocol.io)
- [Report issues](https://github.com/promptibus/mcp/issues)

## License

MIT — © Promptibus
