// Server-side rendering errors to the platform's Bugsink (audit INT-07); off without SENTRY_DSN
import { defineMiddleware } from "astro:middleware";
import * as Sentry from "@sentry/node";

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

export const onRequest = defineMiddleware(async (_context, next) => {
  try {
    return await next();
  } catch (error) {
    if (dsn) Sentry.captureException(error);
    throw error;
  }
});
