// Browser errors to the platform's Bugsink (audit INT-07). The DSN is baked in at build time
// from the SENTRY_DSN repository variable; without it (local, CI) nothing is loaded.
import * as Sentry from "@sentry/browser";

const dsn = import.meta.env.PUBLIC_SENTRY_DSN;
if (dsn)
  Sentry.init({
    dsn,
    release: import.meta.env.PUBLIC_RELEASE_SHA,
    environment: "production",
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
