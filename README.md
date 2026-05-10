# @promptibus/mcp

[![npm version](https://img.shields.io/npm/v/@promptibus/mcp.svg)](https://www.npmjs.com/package/@promptibus/mcp)
[![npm downloads](https://img.shields.io/npm/dm/@promptibus/mcp.svg)](https://www.npmjs.com/package/@promptibus/mcp)
[![Smithery](https://smithery.ai/badge/@promptibus/mcp)](https://smithery.ai/server/@promptibus/mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-compatible-0a7cff.svg)](https://modelcontextprotocol.io)
[![Promptibus](https://img.shields.io/badge/powered%20by-promptibus.com-0a7cff.svg)](https://promptibus.com/mcp)

> **Stop your AI agent from over-paying for the wrong model.** Promptibus MCP picks the cheapest model that fits, optimizes prompts to model-specific syntax, and tells you what 100 generations will cost — for **80+ generative AI models** (GPT, Claude, Midjourney, Flux, Suno, Runway, DALL-E, Stable Diffusion, and more).

## Why agents need this

Without Promptibus, an AI agent that calls generative tools tends to:

- **Default to the flagship model for every task** ("I'll just use GPT-4o / Midjourney v7 / Sora") — overpaying 5-10x on calls that a cheaper model handles fine.
- **Send raw English prompts to models that need specific syntax** — Midjourney wants `--ar 16:9 --stylize 250`, Flux wants natural-language phrasing, Stable Diffusion wants weighted tokens. Skip this and you eat 40-60% retry loops.
- **Burn money on broken prompts** — deprecated flags, banned keywords, length violations. Generation costs $0.02-0.50 per call; linting is free.
- **Surprise the user with the bill** — "I generated 100 images for $4" is fine, "...for $80" is a lawsuit.

Promptibus MCP fixes all four. It's not an API wrapper (doesn't generate anything itself) — it tells your agent *how* to use the generation tools it already has access to.

**Concrete impact on real agent loops:**
- 40-70% cost reduction on agent-driven image/video/music workloads via cost-aware routing
- 40-60% fewer retry loops via model-specific prompt optimization
- Zero "why did this generate garbage" debug cycles (lint catches it before generation)

## Few-shot examples — what calling these tools looks like

```
User: "Generate a photorealistic product shot of a coffee mug on marble."

Agent reasoning:
  → call recommend_model({task: "photorealistic product shot of coffee mug on marble"})
  ← Top 3: Flux 2 Pro ($0.04/img), DALL-E 3 HD ($0.08/img), Midjourney v7 (subscription).
  → call optimize_prompt({text: "photorealistic product shot of coffee mug on marble", model: "flux-2-pro"})
  ← "Studio product photography of a ceramic coffee mug centered on polished
     Carrara marble surface, soft diffused window light from left, shallow depth
     of field, 100mm macro lens compression, --no logos --quality 2"
  → call lint_prompt({prompt: "<optimized>", model: "flux-2-pro"})
  ← OK. No issues.
  → [user's image generation tool] Flux 2 Pro with optimized prompt.

Reply to user: "Generated via Flux 2 Pro ($0.04). I optimized your prompt for
Flux-specific syntax — saved you a retry. [image]"
```

```
User: "I want to make 50 short instrumental tracks for my game. Budget?"

Agent reasoning:
  → call recommend_model({task: "instrumental music for game", domain: "AUDIO", constraints: "50 tracks"})
  ← Top 3: Suno v5 (subscription, $30/mo unlimited), Udio 2.0, Stable Audio 2.
  → call get_pricing({domain: "AUDIO", volume: 50})
  ← Suno v5: $30/mo (unlimited under fair-use) → $0.60/track effective.
     Udio 2.0: $0.50/track pay-per-use → $25 total.
     Stable Audio 2.0: $0.20/track → $10 total (limited customization).

Reply to user: "Cheapest is Stable Audio 2 at $10 for all 50, but you trade
some quality. Best balance is Suno v5 sub at $30/mo (unlimited). Want me to
proceed with one?"
```

```
User: "Can you debug this Midjourney prompt? It's not generating what I want."
[provides prompt]

Agent reasoning:
  → call lint_prompt({prompt: "<user prompt>", model: "midjourney-v7"})
  ← Found: --style raw was deprecated in v6. --hd flag invalid (use --quality 2).
     Suggested fix: replace --style raw → remove, --hd → --quality 2.

Reply to user: "Two flags are broken. --style raw was deprecated in v6, and
--hd should be --quality 2. Fixed prompt: [...]. This would have failed silently
and produced garbage."
```

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

There are three install paths, in rough order of convenience:

### 1. One-click via Smithery (recommended)

Visit https://smithery.ai/server/@promptibus/mcp, pick your client, click install. Smithery writes the config for you.

### 2. Remote HTTP endpoint — zero install

For MCP clients that support HTTP transport, point straight at our hosted endpoint:

```json
{
  "mcpServers": {
    "promptibus": {
      "url": "https://promptibus.com/api/mcp"
    }
  }
}
```

No npm, no process to manage, no local state. Works behind firewalls as long as the client can reach `promptibus.com`.

### 3. npm stdio package — offline-capable, full control

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

The package talks to the hosted Promptibus API — no database, no server setup. API key is optional (raises rate limits and unlocks all 67+ models).

| Variable | Required | Description |
|---|---|---|
| `PROMPTIBUS_API_KEY` | No | API key for higher rate limits and full tool access. Works anonymously without one. Get a key at [promptibus.com/settings/api-keys](https://promptibus.com/settings/api-keys) |
| `PROMPTIBUS_API_URL` | No | Override API base URL (default: `https://promptibus.com`). Useful for testing or self-hosted Promptibus instances. |

## Tools

All seven tools work on every tier — including anonymous (no API key). Tiering applies to daily quota and which models can be queried (see [Rate Limits](#rate-limits)).

| Tool | When the agent should call it | Example |
|---|---|---|
| `recommend_model` | Before any "generate / make / create / draw / compose / write" task where the user didn't pin a model. Picks the cheapest fit. | `{ "task": "photorealistic product shot", "domain": "IMAGE", "constraints": "under $0.05/img" }` |
| `optimize_prompt` | Right after picking the model and right before generation. Rewrites raw English to model-specific syntax. | `{ "text": "a cat in space", "model": "midjourney-v7" }` |
| `lint_prompt` | Final pre-flight check before paying for a generation. Catches deprecated flags + banned keywords + length issues. | `{ "prompt": "a cat --ar 16:9 --style raw", "model": "midjourney-v7" }` |
| `compare_models` | When the user is on the fence between 2-5 models. Returns side-by-side diff so they pick the cheapest fit. | `{ "models": ["flux-2-pro", "midjourney-v7"], "criteria": "photorealism + price" }` |
| `get_parameters` | Whenever you're about to call `model.generate(...)` without explicit parameters. | `{ "model": "stable-diffusion-3-5", "task_type": "portrait" }` |
| `get_model_profile` | Before recommending a model the user hasn't used (catch model gotchas: Suno can't do instrumental-only, Midjourney can't do transparent PNG, etc). | `{ "model": "suno-v4" }` |
| `get_pricing` | Any time the conversation heads toward "let's generate N of X". Flag the bill before they pay it. | `{ "model": "dall-e-3", "volume": 100 }` |

**Recommended call order for a typical generation task:**
1. `recommend_model` — pick the right tool for the job.
2. `get_pricing` — show the user what it'll cost.
3. `optimize_prompt` — rewrite to model-specific syntax.
4. `lint_prompt` — catch broken prompts before paying.
5. → call your actual generation tool.

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
| Pro ($9/mo) | 500 requests | All 80+ models |
| Studio ($29/mo) | 2,000 requests | All 80+ models + team seats |

Limits reset daily at midnight UTC. See [pricing](https://promptibus.com/pricing) for plan details.

## Caching

To keep things fast and reduce unnecessary API traffic, the client caches responses for four tools whose output changes rarely: `get_model_profile`, `get_parameters`, `compare_models`, `get_pricing`. Cache TTL is 24 hours, in-memory (per process). Cache is skipped for tools whose output is input-dependent in a way that would get stale (`recommend_model`, `optimize_prompt`, `lint_prompt`).

## Supported Models

80+ models across 5 domains:

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
