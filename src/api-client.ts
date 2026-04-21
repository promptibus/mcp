/**
 * HTTP client for the Promptibus MCP server.
 * Calls the hosted API at promptibus.com (or a custom URL via PROMPTIBUS_API_URL).
 *
 * Includes a 24h in-memory cache for tools whose answers change rarely
 * (model profiles, parameters, model comparisons, pricing). Caching is
 * disabled for tools whose output is input-dependent in a way that
 * shouldn't be stale (recommend_model, optimize_prompt, lint_prompt).
 */

const BASE_URL = process.env.PROMPTIBUS_API_URL || "https://promptibus.com";
const API_KEY = process.env.PROMPTIBUS_API_KEY || "";
const TIMEOUT_MS = 15_000;

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const CACHEABLE_TOOLS = new Set([
  "get_model_profile",
  "get_parameters",
  "compare_models",
  "get_pricing",
]);

type ToolResponse = {
  text: string;
  blocked?: boolean;
  error?: string;
  plan?: string;
};

type CacheEntry = { data: ToolResponse; expiresAt: number };
const cache = new Map<string, CacheEntry>();

function cacheKey(tool: string, args: Record<string, unknown>): string {
  // Deterministic key — sorts object keys so {a:1,b:2} and {b:2,a:1} hit the same entry
  const sorted = Object.fromEntries(
    Object.entries(args).sort(([a], [b]) => a.localeCompare(b)),
  );
  return `${tool}:${JSON.stringify(sorted)}`;
}

export async function callToolApi(
  tool: string,
  args: Record<string, unknown>,
): Promise<ToolResponse> {
  const key = CACHEABLE_TOOLS.has(tool) ? cacheKey(tool, args) : null;

  if (key) {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.data;
  }

  const url = `${BASE_URL}/api/v1/mcp/${tool}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
      },
      body: JSON.stringify(args),
      signal: controller.signal,
    });

    if (!res.ok) {
      let body: string;
      try {
        body = (await res.text()).slice(0, 200);
      } catch {
        body = "(unreadable)";
      }
      throw new Error(`API error ${res.status}: ${body}`);
    }

    const data = (await res.json()) as ToolResponse;

    if (key && !data.error && !data.blocked) {
      cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    }

    return data;
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`API timeout after ${TIMEOUT_MS / 1000}s — try again later`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
