// JSON logs to stdout (platform audit BE-22) and error reporting to the platform's Bugsink
// (INT-07). The platform collects stdout with Fluent Bit: https://logs.yunitztech.com
import { randomUUID } from "node:crypto";
import * as Sentry from "@sentry/node";

type Level = "debug" | "info" | "warn" | "error";

export function log(
  level: Level,
  msg: string,
  fields: Record<string, unknown> = {},
) {
  process.stdout.write(
    JSON.stringify({ time: new Date().toISOString(), level, msg, ...fields }) +
      "\n",
  );
}

// Off without SENTRY_DSN (local and CI). No performance tracing.
const dsn = process.env.SENTRY_DSN;
if (dsn)
  Sentry.init({
    dsn,
    release: process.env.RELEASE_SHA,
    environment: process.env.SENTRY_ENVIRONMENT || "production",
    // No personal data: no user, cookies, headers, bodies, query strings or local variables
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      stackFrameVariables: false,
    },
    tracesSampleRate: 0,
  });

export function reportError(error: unknown, requestId?: string) {
  if (!dsn) return;
  Sentry.withScope((scope) => {
    if (requestId) scope.setTag("requestId", requestId);
    Sentry.captureException(error);
  });
}

// X-Request-ID from the gateway if it looks like an id; otherwise a new one
const REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;
export function requestId(header: unknown): string {
  return typeof header === "string" && REQUEST_ID.test(header)
    ? header
    : randomUUID();
}
