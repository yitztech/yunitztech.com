import { randomBytes } from "node:crypto";
import { test as base, createBdd } from "playwright-bdd";
import type { APIRequestContext, APIResponse } from "@playwright/test";
import { adminEmail, adminPassword, siteOrigin } from "./env";
import { adminLogin } from "./helpers";

/** Estado compartido entre los pasos de un mismo escenario. */
export interface World {
  response: APIResponse;
  body?: any;
  vars: Record<string, any>;
  /** IP simulada: aísla los límites de tasa entre escenarios. */
  ip: string;
}

// El gateway toma la IP del cliente de X-Forwarded-For solo si el pares está
// en TRUSTED_PROXY_CIDR (así ocurre en CI). Cada escenario usa una IP propia.
const randomIp = () => {
  const b = randomBytes(3);
  return `10.${b[0]}.${b[1]}.${b[2]}`;
};

type Fixtures = {
  world: World;
  api: APIRequestContext;
  /** Cliente independiente con sesión de administrador ya iniciada. */
  admin: APIRequestContext;
  adminCredentials: { email: string; password: string };
};

export const test = base.extend<Fixtures>({
  world: async ({}, use) => use({ vars: {}, ip: randomIp() } as World),
  adminCredentials: async ({}, use) =>
    use({ email: adminEmail, password: adminPassword }),
  api: async ({ playwright, baseURL, world }, use) => {
    const ctx = await playwright.request.newContext({
      baseURL,
      ignoreHTTPSErrors: process.env.TEST_INSECURE_TLS === "1",
      extraHTTPHeaders: { Origin: siteOrigin, "X-Forwarded-For": world.ip },
    });
    await use(ctx);
    await ctx.dispose();
  },
  admin: async ({ playwright, baseURL, world }, use) => {
    const ctx = await playwright.request.newContext({
      baseURL,
      ignoreHTTPSErrors: process.env.TEST_INSECURE_TLS === "1",
      extraHTTPHeaders: { Origin: siteOrigin, "X-Forwarded-For": world.ip },
    });
    await adminLogin(ctx);
    await use(ctx);
    await ctx.dispose();
  },
  extraHTTPHeaders: async ({ world }, use) =>
    use({ "X-Forwarded-For": world.ip }),
});

export const { Given, When, Then, Before, After } = createBdd(test);
export { expect } from "@playwright/test";
