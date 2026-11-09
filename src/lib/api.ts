// Helpers shared by all API route handlers: JSON responses, safe error handling, body reading, rate limiting.
import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/api-error";
import { LIMITS } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidId } from "@/lib/validation";
import { TipsDataError } from "@/lib/tips";

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

// Codes meaning "the database cannot be reached right now" (Node network errors, PostgreSQL and Prisma codes).
const DATABASE_UNAVAILABLE_CODES = new Set([
  "ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET", "EAI_AGAIN", "57P01", "57P03", "08001", "08006",
  "P1001", "P1002", "P1008", "P1017", "P2024",
]);

function errorCode(error: unknown): string | undefined {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : undefined;
}

function isDatabaseUnavailable(error: unknown): boolean {
  // Driver errors are often wrapped, so look a few levels down the "cause" chain.
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current instanceof Error; depth++) {
    const code = errorCode(current);
    if (code && DATABASE_UNAVAILABLE_CODES.has(code)) return true;
    if (current.message === "DATABASE_URL is not set" || current.name.includes("Initialization")) return true;
    current = current.cause;
  }
  return false;
}

/** Turns any thrown error into a safe Estonian JSON response. Never exposes SQL, credentials or stack traces. */
export function handleError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return json({ error: error.message }, error.status);
  }
  if (error instanceof TipsDataError) {
    console.error("Tips data error:", error.message);
    return json({ error: "Sisustusnõuannete andmeid ei õnnestunud laadida." }, 500);
  }
  // Log only the error type and code: the message could contain connection details.
  console.error("API error:", error instanceof Error ? error.name : "unknown", errorCode(error) ?? "");
  if (isDatabaseUnavailable(error)) {
    return json({ error: "Andmebaas pole praegu kättesaadav. Proovi mõne hetke pärast uuesti." }, 503);
  }
  return json({ error: "Midagi läks valesti. Proovi uuesti." }, 500);
}

/** Wraps a route handler so every error becomes a safe response. */
export function guarded<Args extends unknown[]>(handler: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleError(error);
    }
  };
}

/** Reads and parses a JSON request body, with a size limit. */
export async function readJson(request: NextRequest, options: { allowEmpty?: boolean } = {}): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > LIMITS.maxRequestBytes) throw new ApiError(413, "Päring on liiga suur.");

  const text = await request.text();
  if (text.length > LIMITS.maxRequestBytes) throw new ApiError(413, "Päring on liiga suur.");
  if (text.trim() === "") {
    if (options.allowEmpty) return {};
    throw new ApiError(400, "Päringu sisu on vigane.");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "Päringu sisu on vigane.");
  }
}

function clientKey(request: NextRequest): string {
  // Railway puts the visitor's address first in x-forwarded-for.
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

/** Throws a 429 error if this visitor has made too many requests of this kind recently. */
export function enforceRateLimit(request: NextRequest, bucket: "read" | "write" | "message"): void {
  const settings = { read: [120, 60_000], write: [40, 60_000], message: [15, 60_000] }[bucket];
  const waitSeconds = checkRateLimit(`${bucket}:${clientKey(request)}`, settings[0], settings[1]);
  if (waitSeconds > 0) {
    throw new ApiError(429, `Liiga palju päringuid. Oota ${waitSeconds} sekundit ja proovi uuesti.`);
  }
}

/** Throws a 404 if the id from the URL is not a plausible id. */
export function requireValidId(id: string, notFoundMessage: string): void {
  if (!isValidId(id)) throw new ApiError(404, notFoundMessage);
}
