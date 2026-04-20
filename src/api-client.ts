/**
 * HTTP client for the Promptibus MCP server.
 * Calls the hosted API at promptibus.com (or a custom URL via PROMPTIBUS_API_URL).
 */

const BASE_URL = process.env.PROMPTIBUS_API_URL || "https://promptibus.com";
const API_KEY = process.env.PROMPTIBUS_API_KEY || "";
const TIMEOUT_MS = 15_000;

export async function callToolApi(
  tool: string,
  args: Record<string, unknown>,
): Promise<{ text: string; blocked?: boolean; error?: string; plan?: string }> {
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

    return res.json();
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`API timeout after ${TIMEOUT_MS / 1000}s — try again later`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
