import { randomBytes } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";
import { adminEmail, adminPassword } from "./env";

export const unique = () => randomBytes(5).toString("hex");

/**
 * Expande macros en los valores de las tablas Gherkin:
 *   @repeat(a,101) · @nul · @newline · @empty · @true · @false
 * Devuelve `undefined` para @missing (el campo se omite).
 */
export function expand(raw: string): unknown {
  if (raw === "@missing") return undefined;
  if (raw === "@true") return true;
  if (raw === "@false") return false;
  if (raw === "@empty") return "";
  return raw
    .replace(/@repeat\((.*?),(\d+)\)/g, (_, s, n) => s.repeat(Number(n)))
    .replaceAll("@nul", "\u0000")
    .replaceAll("@newline", "\n");
}

/** Sustituye {{clave}} por vars[clave]. */
export function interpolate(text: string, vars: Record<string, any>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in vars))
      throw new Error(`Variable {{${k}}} no definida en el escenario`);
    return String(vars[k]);
  });
}

export function applyOverride(
  base: Record<string, unknown>,
  field: string,
  raw: string,
): Record<string, unknown> {
  const value = expand(raw);
  const next = { ...base };
  if (value === undefined) delete next[field];
  else next[field] = value;
  return next;
}

export function validContact(
  vars: Record<string, any>,
): Record<string, unknown> {
  vars.contactEmail ??= `qa-${unique()}@example.test`;
  return {
    name: "Prueba QA",
    email: vars.contactEmail,
    company: "Negocio de prueba",
    service: "Reservaciones",
    message: `Quiero validar un sistema de citas para mi pequeño negocio (${vars.contactEmail}).`,
    locale: "es",
    consent: true,
  };
}

export function validPost(
  vars: Record<string, any>,
  locale = "es",
): Record<string, unknown> {
  vars.postKey ??= `qa-${unique()}`;
  return {
    translation_key: vars.postKey,
    locale,
    slug: `${vars.postKey}-${locale}`,
    title: `Artículo de prueba ${vars.postKey}`,
    excerpt: "Un extracto de prueba lo bastante largo para validar el límite.",
    body: "Contenido de prueba del artículo para validar el CMS. ".repeat(4),
    image: "/images/mvp-studio.webp",
    image_alt: "Imagen de prueba",
    published: false,
  };
}

export async function adminLogin(ctx: APIRequestContext) {
  const res = await ctx.post("/api/login", {
    data: { email: adminEmail, password: adminPassword },
  });
  if (res.status() !== 201)
    throw new Error(
      `Login de administrador falló (${res.status()}): ¿ADMIN_EMAIL/ADMIN_PASSWORD?`,
    );
  return res;
}

export async function findContact(admin: APIRequestContext, email: string) {
  const data = await (await admin.get("/api/admin/data")).json();
  return (data.contacts as any[]).find((c) => c.email === email);
}

export const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
