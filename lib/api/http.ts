import { NextResponse } from "next/server";

/**
 * Thrown by route handlers to signal a specific HTTP status/message.
 * Caught by withRouteErrorHandling and turned into the standard
 * { error: string } envelope — the one JSON error shape used by every
 * API route in this app.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Next.js signals its own control flow (bailing a route out of static
 * generation because it reads searchParams, notFound(), redirect()) by
 * throwing an error tagged with a `digest`. Those must propagate
 * untouched — swallowing them here and returning a normal 500 would hide
 * the signal Next.js's own build/render pipeline is relying on.
 */
function isNextInternalControlFlowError(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_") || digest === "DYNAMIC_SERVER_USAGE");
}

/**
 * Wraps a Route Handler so that any ApiError (validation, not-found) or
 * unexpected thrown error (Prisma failure, etc.) is converted into the
 * same { error: string } JSON envelope instead of an unhandled 500 with
 * no body. Every route in app/api uses this — it's the one place error
 * formatting is decided.
 */
export function withRouteErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>,
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (isNextInternalControlFlowError(error)) {
        throw error;
      }
      if (error instanceof ApiError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      console.error("API route error", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Internal server error" },
        { status: 500 },
      );
    }
  };
}

/**
 * Narrows a raw string to T if it's one of allowedValues, else undefined.
 * Used directly by Server Component pages (a bad/hand-typed filter value
 * in the URL should just fall back to "no filter", not crash the page);
 * parseEnumParam below builds on this for API routes, where a bad value
 * should fail loudly instead.
 */
export function matchEnumValue<T extends string>(
  raw: string | undefined,
  allowedValues: readonly T[],
): T | undefined {
  if (raw === undefined) return undefined;
  return (allowedValues as readonly string[]).includes(raw) ? (raw as T) : undefined;
}

/**
 * Reads an optional enum-valued query param. Absent -> undefined (no
 * filter). Present but not one of allowedValues -> throws ApiError(400)
 * so a bad value fails loudly instead of reaching Prisma unvalidated.
 */
export function parseEnumParam<T extends string>(
  searchParams: URLSearchParams,
  key: string,
  allowedValues: readonly T[],
): T | undefined {
  const raw = searchParams.get(key);
  if (raw === null) return undefined;
  if (!matchEnumValue(raw, allowedValues)) {
    throw new ApiError(`${key} must be one of: ${allowedValues.join(", ")}`, 400);
  }
  return raw as T;
}

/**
 * Parses a page-number-like string for Server Component pages: a bad or
 * missing value falls back to `fallback` rather than crashing the page
 * (unlike the API-route pagination validator, which throws on bad input).
 */
export function toPositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

/**
 * Reads optional page/pageSize query params. Absent -> undefined (caller
 * applies its own default). Present but not a positive integer -> throws
 * ApiError(400).
 */
export function parsePaginationParams(searchParams: URLSearchParams): {
  page?: number;
  pageSize?: number;
} {
  return {
    page: parsePositiveIntParam(searchParams, "page"),
    pageSize: parsePositiveIntParam(searchParams, "pageSize"),
  };
}

function parsePositiveIntParam(searchParams: URLSearchParams, key: string): number | undefined {
  const raw = searchParams.get(key);
  if (raw === null) return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new ApiError(`${key} must be a positive integer`, 400);
  }
  return value;
}
