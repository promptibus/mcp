# Publishing

This doc is for maintainers. It covers npm release and MCP-ecosystem registration.

## Automated release (recommended)

Tagging `vX.Y.Z` triggers [`.github/workflows/release.yml`](./.github/workflows/release.yml) which publishes to **npm**, the **official MCP Registry**, and **Smithery** in one shot.

```bash
# 1. Bump version in BOTH files (they must match the tag)
npm version patch --no-git-tag-version   # writes package.json
jq '.version = "'"$(node -p 'require(\"./package.json\").version')"'" | .packages[0].version = .version' \
   server.json > server.json.tmp && mv server.json.tmp server.json

# 2. Commit + tag + push
git add package.json package-lock.json server.json
git commit -m "Release v0.x.y"
git tag "v$(node -p 'require(\"./package.json\").version')"
git push origin main --tags
```

The workflow verifies that `package.json`, `server.json`, and the tag all match, then:
1. `npm publish --access public --provenance`
2. `mcp-publisher login dns --domain promptibus.com --private-key <secret>`
3. `mcp-publisher publish` — updates the official registry
4. `PUT /servers/promptibus/mcp/releases` on Smithery — triggers capability re-scan

Required GitHub repository secrets (Settings → Secrets and variables → Actions):

| Secret | Purpose | Source |
|---|---|---|
| `NPM_TOKEN` | publish to npm | https://www.npmjs.com/settings/~/tokens → Generate New Token → Automation |
| `PROMPTIBUS_DNS_PRIVATE_KEY` | auth to MCP Registry under `com.promptibus/*` namespace | 64-char hex — kept by repo maintainer; do not rotate without updating the DNS TXT record |
| `SMITHERY_API_KEY` | publish releases to Smithery | Smithery dashboard → Settings → API Keys |

If a secret rotates, update it in the repo Settings.

## Manual npm release (fallback)

```bash
# 1. Update version
npm version patch   # or minor / major

# 2. Build & verify
npm run build
npm pack --dry-run  # sanity check on what ships

# 3. Publish (scoped public package)
npm publish --access public

# 4. Verify
npm view @promptibus/mcp version
```

Package ships `dist/`, `README.md`, `LICENSE`, and `package.json` only. No `src/`.

## Official MCP Registry

The [MCP Registry](https://registry.modelcontextprotocol.io) is the authoritative discovery endpoint used by Claude Desktop, Cursor, Windsurf, and other hosts.

Our entry lives in [`server.json`](./server.json) under the namespace `io.github.promptibus/mcp`.

### Publish via CLI

The registry uses a Go CLI, `mcp-publisher`. Install and run:

```bash
# Install via go (requires Go 1.22+)
go install github.com/modelcontextprotocol/registry/cmd/mcp-publisher@latest

# Or clone + build
git clone https://github.com/modelcontextprotocol/registry
cd registry && make publisher
# binary at ./bin/mcp-publisher

# Auth via GitHub OAuth (opens browser)
mcp-publisher login github

# Publish
cd /path/to/promptibus/mcp
mcp-publisher publish

# Verify
curl -s "https://registry.modelcontextprotocol.io/v0/servers?search=promptibus" | jq
```

### Namespace auth

Our namespace is `io.github.promptibus/mcp`. GitHub OAuth must authenticate as a member of the `promptibus` GitHub org with write access to `promptibus/mcp`.

If org auth is problematic, the alternative is domain-verified namespace `com.promptibus/mcp` — add a TXT record:

```
_mcp-verify.promptibus.com  TXT  "mcp-registry-challenge=<challenge>"
```

The CLI prints the challenge during `mcp-publisher login dns`.

## Third-party Registries

### Smithery.ai

1. Visit https://smithery.ai/new
2. Submit `https://github.com/promptibus/mcp`
3. Smithery auto-scans and generates a listing with one-click install for Claude Desktop / Cursor.

No config file needed — they read `package.json`, `README.md`, and the MCP SDK metadata.

### Glama.ai

1. Visit https://glama.ai/mcp/servers
2. Click "Add your server" (bottom of the list)
3. Paste GitHub URL; they auto-populate.

### PulseMCP

Submit at https://pulsemcp.com/submit — same pattern (GitHub URL + description).

### mcp.so

Submit at https://mcp.so/submit — similar flow.

### awesome-mcp lists

Open PRs to these curated lists on GitHub:

- https://github.com/punkpeye/awesome-mcp-servers (largest)
- https://github.com/appcypher/awesome-mcp-servers
- https://github.com/wong2/awesome-mcp-servers

Each accepts a single-line entry under the relevant category (likely "Model Intelligence" or "AI/ML").

## Version bump checklist

When cutting a new release:

- [ ] Update `version` in `package.json`
- [ ] Update `version` in `server.json` (both `server.version` and `packages[0].version`)
- [ ] Update README if tool count or config changed
- [ ] Run `npm run build` and commit `dist/` if applicable
- [ ] Commit, tag (`git tag v0.x.y`), push
- [ ] `npm publish --access public`
- [ ] `mcp-publisher publish` to push server.json update
- [ ] Post announcement on Twitter/HN/Reddit for significant releases
