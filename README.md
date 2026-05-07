# @promptibus/mcp — model intelligence for AI agents

[![npm version](https://img.shields.io/npm/v/@promptibus/mcp.svg)](https://www.npmjs.com/package/@promptibus/mcp)
[![npm downloads](https://img.shields.io/npm/dm/@promptibus/mcp.svg)](https://www.npmjs.com/package/@promptibus/mcp)
[![Smithery](https://smithery.ai/badge/@promptibus/mcp)](https://smithery.ai/server/@promptibus/mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-compatible-0a7cff.svg)](https://modelcontextprotocol.io)
[![Powered by Promptibus](https://img.shields.io/badge/powered%20by-promptibus.com-0a7cff.svg)](https://promptibus.com/mcp)
[![LobeHub MCP Badge](https://lobehub.com/badge/mcp/promptibus-mcp)](https://lobehub.com/mcp/promptibus-mcp)

> Your agent thinks Midjourney still uses `--v 5`. It doesn't — that flag was dropped at v7.
> It assumes DALL-E 3 and FLUX Schnell cost the same. They differ by ~50×.
> It confidently writes `[Verse]` tags for Suno. They were removed in v4.
>
> **This MCP server fixes that.** Real syntax, real prices, real recommendations for 67+ generative AI models — over the Model Context Protocol.

---

**Works with:** Claude Desktop · Claude Code · Cursor · Windsurf · Zed · Continue.dev · n8n · any stdio MCP client
**Domains:** image · video · audio · text · code
**Cost to start:** $0, no account, no API key

## See it in action

Your agent receives a brief — *"30-second cinematic video of a thunderstorm at sea."* — and instead of guessing, calls a tool.

```
recommend_model({ task: "30s cinematic video, thunderstorm at sea", domain: "VIDEO" })
```

```
Top 3 models for: "30s cinematic video, thunderstorm at sea"

1. Runway Gen-4 (Runway)
   Domain: VIDEO | Cost: 1 credit | Version: latest
   Improved temporal consistency, camera control, up to 20-second coherent clips.
   Source: https://promptibus.com/models/runway-gen-4

2. Sora (OpenAI)
   Domain: VIDEO | Cost: 1 credit | Version: latest
   Cinematic-quality clips from text prompts.
   Source: https://promptibus.com/models/sora

3. Veo 2 (Google)
   Domain: VIDEO | Cost: 1 credit | Version: latest
   High-fidelity clips with cinematic camera control.
   Source: https://promptibus.com/models/veo-2
```

The agent picks one, formats the prompt with `optimize_prompt`, lints the result with `lint_prompt`, checks `get_pricing` for the volume budget — all before a single token of generation cost is spent.

## Why use this

- **Stops hallucination.** Your agent answers from a curated DB of 67+ models, not from training data that's 6 months stale.
- **Real money, real choices.** `get_pricing({ model: "dall-e-3", volume: 100 })` returns actual USD cost plus cheaper alternatives — agents can finally optimize for budget, not just "vibes."
- **Right model for the job.** `recommend_model` ranks across all five domains (image / video / audio / text / code) with reasoning, not guessing.
- **Lint before you generate.** `lint_prompt` catches deprecated flags, invalid parameters, and length violations *before* you burn credits.
- **Zero friction.** Works anonymously without an account. `npx -y @promptibus/mcp` — that's the install.

## Install in 30 seconds

**Option A — Smithery (recommended):**

Visit [smithery.ai/server/@promptibus/mcp](https://smithery.ai/server/@promptibus/mcp), pick your client, click install.

**Option B — drop into your client's MCP config:**

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

**Option C — hosted HTTP endpoint (no install at all):**

For clients that support HTTP transport:

```json
{
  "mcpServers": {
    "promptibus": {
      "url": "https://promptibus.com/api/mcp"
    }
  }
}
```

Per-client paths are listed under [Client configs](#client-configs) below.

## Tools

Every tool is available on every tier — including anonymous. Tiering applies to daily request limits and which models you can query against (free-tier covers 10 popular models; Pro/Studio unlocks all 67+).

| Tool | What it does | Example |
|---|---|---|
| `recommend_model` | Top 3 models for a task, with reasoning + cost. | `{ task: "logo with embedded text", domain: "IMAGE" }` |
| `optimize_prompt` | Reformats a prompt for a specific model — applies model-specific syntax + community-tested wording. | `{ text: "a cat in space", model: "midjourney-v7" }` |
| `lint_prompt` | Finds deprecated flags, invalid parameters, length violations. Suggests fixes. | `{ prompt: "a cat --ar 16:9", model: "flux-2-pro" }` |
| `compare_models` | Side-by-side: provider, domain, cost, capabilities. 2–5 models. | `{ models: ["flux-2-pro","midjourney-v7"], criteria: "photorealism" }` |
| `get_parameters` | Recommended parameters: defaults, ranges, community configs. | `{ model: "stable-diffusion-3-5", task_type: "portrait" }` |
| `get_model_profile` | Full profile: capabilities, syntax guide, parameters, community tips, related prompts. | `{ model: "suno-v4" }` |
| `get_pricing` | Real USD pricing for a model / domain / planned volume. Includes cheaper alternatives. | `{ model: "dall-e-3", volume: 100 }` |

## Use cases

**"Which video model gives me the longest single shot under $10?"**
→ `get_pricing({ domain: "VIDEO", volume: 60 })` returns a sorted matrix; agent picks the cheapest that meets duration.

**"Convert this DALL-E prompt to Midjourney v7 syntax."**
→ `optimize_prompt({ text: "...", model: "midjourney-v7" })` reformats — proper aspect-ratio flag, no `--v`, model-specific suffixes applied.

**"Will this Suno prompt work with v4?"**
→ `lint_prompt({ prompt: "[Verse] ...", model: "suno-v4" })` flags `[Verse]` as deprecated and proposes the v4 structure.

**"I need to generate 1000 images at the cheapest viable quality."**
→ `recommend_model` filters by domain + budget; `get_pricing` validates total cost; agent ships under budget.

## Resources

Browsable model profiles as MCP resources:

```
promptibus://models/{slug}
```

Each resource returns a Markdown profile (provider, domain, version, pricing, full guide). Useful for agents that want to surface model info as a sidebar.

## Prompts

The `system-prompt` MCP prompt exposes curated system prompts from the Promptibus community.

```
system-prompt                                         # lists all available
system-prompt { "slug": "midjourney-prompt-architect" } # returns full text
```

## Plans & rate limits

Anonymous users get full tool access — no account needed. Limits + model coverage scale with plan.

| Plan | Daily requests | Model coverage |
|---|---|---|
| Anonymous (no key) | 25 | 10 free-tier models |
| Free (with key) | 100 | 10 free-tier models |
| Pro | 500 | All 67+ models |
| Studio | 2,000 | All 67+ models |

Limits reset daily at midnight UTC. Plans + signup at [promptibus.com/pricing](https://promptibus.com/pricing).

## Authentication

Set `PROMPTIBUS_API_KEY` in your client config:

```json
{
  "mcpServers": {
    "promptibus": {
      "command": "npx",
      "args": ["-y", "@promptibus/mcp"],
      "env": { "PROMPTIBUS_API_KEY": "psy_your_api_key_here" }
    }
  }
}
```

| Variable | Required | Purpose |
|---|---|---|
| `PROMPTIBUS_API_KEY` | No | Higher rate limits, full model coverage. Get one at [promptibus.com/settings/api-keys](https://promptibus.com/settings/api-keys). |
| `PROMPTIBUS_API_URL` | No | Override the API base (default `https://promptibus.com`). For self-hosted Promptibus or staging. |

## FAQ

**Does this generate images, video, or audio?**
No. It tells your agent *how* to use whatever generation API the agent already has access to. Think of it as a prompt engineering co-pilot, not a router.

**Do I need an account to start?**
No. Anonymous mode works out of the box (25 req/day, free-tier models). API key raises limits and unlocks all 67+ models.

**Are my prompts logged?**
Tool requests transit `promptibus.com` over HTTPS. We don't persist prompt bodies. API keys are SHA-256 hashed server-side; the raw key never lands in logs.

**How fresh is the model data?**
Community-curated. New models typically appear within days of release; pricing is reviewed monthly. The data lives in a Postgres-backed catalogue at [promptibus.com/models](https://promptibus.com/models).

**Does it work offline?**
The MCP server runs locally; the catalogue lives at promptibus.com. So: agent ↔ MCP server is local stdio, MCP server ↔ Promptibus is HTTPS. No internet, no answers.

**Can I self-host the catalogue?**
Yes. The Promptibus app is open-source — clone [promptibus/promptibus](https://github.com/promptibus/promptibus), point `PROMPTIBUS_API_URL` at your deployment.

**Is there an HTTP transport instead of stdio?**
Yes — point your client at `https://promptibus.com/api/mcp`. Useful for sandboxed environments, browser-based MCP clients, and CI.

## Caching

The client caches responses for tools whose output rarely changes (`get_model_profile`, `get_parameters`, `compare_models`, `get_pricing`). TTL: 24 h, in-memory per process. Cache is bypassed for tools whose output is input-dependent (`recommend_model`, `optimize_prompt`, `lint_prompt`).

## Privacy

- HTTPS to `promptibus.com`; no third-party trackers in the request path
- API keys hashed server-side (SHA-256)
- Anonymous usage rate-limited by IP
- No client-side database, no local state beyond a single HTTP client

## Client configs

The same `npx -y @promptibus/mcp` command works for every stdio client. Only the config file location and JSON shape differ.

<details>
<summary><strong>Claude Desktop</strong></summary>

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
</details>

<details>
<summary><strong>Claude Code</strong></summary>

```bash
claude mcp add promptibus -- npx -y @promptibus/mcp
```
</details>

<details>
<summary><strong>Cursor</strong></summary>

`.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global):

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
</details>

<details>
<summary><strong>Windsurf</strong></summary>

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
</details>

<details>
<summary><strong>Zed</strong></summary>

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
</details>

<details>
<summary><strong>Continue.dev</strong></summary>

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
</details>

<details>
<summary><strong>n8n</strong></summary>

In the **MCP Client** node, set transport to **stdio**:

```
Command:   npx
Arguments: -y @promptibus/mcp
```
</details>

## Supported models

**67+ models across 5 domains.** Highlights:

- **IMAGE** — Midjourney v7 / v6.1 · FLUX 2 Pro / 1.1 Pro · Stable Diffusion 3.5 · DALL-E 3 · GPT Image 1 · Ideogram 3 · Recraft V4 Pro · Imagen 4 Ultra · Leonardo Phoenix
- **VIDEO** — Sora · Runway Gen-3 / Gen-4 · Kling 2.5 · Pika 3 · Luma Dream Machine · Hailuo · Seedance 2 · Veo 2 · LTX 2.3 · Helios
- **AUDIO** — Suno v4 / v5 · Udio 2 · ElevenLabs · Hume AI · Stable Audio 2 · MusicGen · ACE-Step
- **TEXT** — GPT-5 / 5.4 · Claude 4 Opus / Sonnet · Claude Sonnet 4.6 · Gemini 3.1 Pro / 2.5 Pro · DeepSeek R2 · Llama 4 Maverick · Grok 3
- **CODE** — Claude Code · Cursor · Windsurf · Codex CLI · Devin · Augment Code · Aider · Copilot · DeepSeek V3 · Nemotron 3 Super

Full catalogue: [promptibus.com/models](https://promptibus.com/models).

## ⭐ Help others find this

If `@promptibus/mcp` saves your agent from a wrong-syntax run or a $50 surprise on DALL-E volume, [drop a star](https://github.com/promptibus/mcp) on the repo. Stars are how new MCP users discover quality servers in a sea of generic wrappers — it costs you a click and the next person ships faster.

[![Star this repo](https://img.shields.io/github/stars/promptibus/mcp?style=social)](https://github.com/promptibus/mcp/stargazers)

## Links

- **Website:** [promptibus.com](https://promptibus.com)
- **All models:** [promptibus.com/models](https://promptibus.com/models)
- **API keys:** [promptibus.com/settings/api-keys](https://promptibus.com/settings/api-keys)
- **Pricing:** [promptibus.com/pricing](https://promptibus.com/pricing)
- **Issues:** [github.com/promptibus/mcp/issues](https://github.com/promptibus/mcp/issues)
- **Main app source:** [github.com/promptibus/promptibus](https://github.com/promptibus/promptibus)
- **MCP spec:** [modelcontextprotocol.io](https://modelcontextprotocol.io)

## License

MIT — © Promptibus
