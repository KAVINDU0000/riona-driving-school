/** Client-side JSON call to a maintenance API route. Returns the server's safe message on failure, never a raw error. */
export type ApiResult = { ok: true; data: unknown } | { ok: false; message: string };

export async function sendJson(url: string, method: "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown): Promise<ApiResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) return { ok: false, message: data?.error ?? "Something went wrong. Please try again." };
    return { ok: true, data };
  } catch {
    return { ok: false, message: "Could not reach the server. Check your connection and try again." };
  }
}
