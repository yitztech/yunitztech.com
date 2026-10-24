import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  LIMITS,
  contactSchema,
  changePasswordSchema,
  passwordResetSchema,
  passwordResetRequestSchema,
  idSchema,
  imagePath,
  loginSchema,
  postSchema,
  settingsSchema,
  statusSchema,
  viewSchema,
} from "../../apps/api/src/validation";

const contact = (over: Record<string, unknown> = {}) => ({
  name: "Ana María O'Connor-Pérez",
  email: "ana@example.com",
  company: "Acme & Sons, S.L.",
  service: "Desarrollo de MVP",
  message: "Necesitamos un MVP para validar nuestra idea de negocio.",
  locale: "es",
  consent: true,
  ...over,
});
const ok = (schema: any, value: unknown) =>
  assert.equal(
    schema.safeParse(value).success,
    true,
    String(JSON.stringify(value)).slice(0, 120),
  );
const bad = (schema: any, value: unknown) =>
  assert.equal(
    schema.safeParse(value).success,
    false,
    String(JSON.stringify(value)).slice(0, 120),
  );

describe("contactSchema · éxito", () => {
  test("acepta un contacto completo", () => ok(contactSchema, contact()));
  test("acepta empresa vacía", () =>
    ok(contactSchema, contact({ company: "" })));
  test("acepta honeypot vacío", () =>
    ok(contactSchema, contact({ website: "" })));
  for (const name of [
    "Li",
    "José Ángel",
    "Zoë Müller",
    "Søren Ålesund",
    "Nguyễn Văn An",
    "李小龍",
    "Мария Иванова",
    "Jean-Luc Picard",
    "D’Artagnan",
    "Dr. Smith",
  ])
    test(`acepta el nombre «${name}»`, () =>
      ok(contactSchema, contact({ name })));
  test("normaliza espacios y mayúsculas del correo", () => {
    const r = contactSchema.parse(
      contact({ name: "  Ana  ", email: "  ANA@Example.COM " }),
    );
    assert.equal(r.name, "Ana");
    assert.equal(r.email, "ana@example.com");
  });
});

describe("contactSchema · límites de longitud", () => {
  const edge = (
    field: string,
    { min, max }: { min?: number; max: number },
    char = "a",
  ) => {
    test(`${field}: ${max} caracteres es válido`, () =>
      ok(contactSchema, contact({ [field]: char.repeat(max) })));
    test(`${field}: ${max + 1} caracteres es inválido`, () =>
      bad(contactSchema, contact({ [field]: char.repeat(max + 1) })));
    if (min)
      test(`${field}: ${min - 1} caracteres es inválido`, () =>
        bad(contactSchema, contact({ [field]: char.repeat(min - 1) })));
    if (min)
      test(`${field}: ${min} caracteres es válido`, () =>
        ok(contactSchema, contact({ [field]: char.repeat(min) })));
  };
  edge("name", LIMITS.name);
  edge("company", LIMITS.company);
  edge("service", LIMITS.service);
  edge("message", LIMITS.message);
  test("email: 254 caracteres es válido", () => {
    const local = "a".repeat(64);
    const domain = `${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(55)}.com`;
    const email = `${local}@${domain}`;
    assert.ok(email.length <= LIMITS.email.max);
    ok(contactSchema, contact({ email }));
  });
  test("email: más de 254 caracteres es inválido", () =>
    bad(contactSchema, contact({ email: `${"a".repeat(250)}@example.com` })));
  test("el nombre solo con espacios cuenta como vacío", () =>
    bad(contactSchema, contact({ name: "     " })));
  test("el mensaje solo con espacios cuenta como vacío", () =>
    bad(contactSchema, contact({ message: " ".repeat(40) })));
});

describe("contactSchema · tipo de caracteres", () => {
  for (const name of [
    "Ana1",
    "R2-D2",
    "<script>alert(1)</script>",
    "Ana; DROP TABLE contacts",
    "Ana@Example",
    "Ana\nPérez",
    "Ana\u0000Pérez",
    "-Ana",
    "'Ana",
    "Ana_Pérez",
    "Ana (Anita)",
    "Ana 😀",
  ])
    test(`rechaza el nombre ${JSON.stringify(name)}`, () =>
      bad(contactSchema, contact({ name })));
  for (const company of [
    "<b>Acme</b>",
    "Acme\u0000",
    "Acme\nSL",
    "Acme; DROP",
    "Acme | SL",
  ])
    test(`rechaza la empresa ${JSON.stringify(company)}`, () =>
      bad(contactSchema, contact({ company })));
  for (const service of ["<img src=x>", "Servicio\u0000", "Servicio\nuno"])
    test(`rechaza el servicio ${JSON.stringify(service)}`, () =>
      bad(contactSchema, contact({ service })));
  test("el mensaje admite saltos de línea y tabuladores", () =>
    ok(
      contactSchema,
      contact({
        message: "Primera línea del mensaje.\n\tSegunda línea con detalles.",
      }),
    ));
  for (const control of ["\u0000", "\u0007", "\u001b", "\u007f"])
    test(`el mensaje rechaza el control ${JSON.stringify(control)}`, () =>
      bad(
        contactSchema,
        contact({ message: `Mensaje válido de largo suficiente${control}fin` }),
      ));
  test("el mensaje admite emoji y Unicode", () =>
    ok(
      contactSchema,
      contact({ message: "Hola 👋 queremos construir una aplicación móvil." }),
    ));
});

describe("contactSchema · correo, consentimiento, estructura", () => {
  for (const email of [
    "",
    "sin-arroba.com",
    "a@",
    "@example.com",
    "a b@example.com",
    "a@@example.com",
    "a@example",
    "a@exa mple.com",
    "ana@example.com\nBcc: x@y.z",
  ])
    test(`rechaza el correo ${JSON.stringify(email)}`, () =>
      bad(contactSchema, contact({ email })));
  for (const email of ["a+tag@example.co.uk", "a.b-c_d@sub.example.org"])
    test(`acepta el correo ${email}`, () =>
      ok(contactSchema, contact({ email })));
  for (const consent of [false, "true", 1, undefined, null])
    test(`rechaza consent=${String(consent)}`, () =>
      bad(contactSchema, contact({ consent })));
  test("rechaza campos desconocidos (strict)", () =>
    bad(contactSchema, contact({ admin: true })));
  for (const l of ["it", "ES", "", "es-ES"])
    test(`rechaza el idioma ${JSON.stringify(l)}`, () =>
      bad(contactSchema, contact({ locale: l })));
  for (const l of ["es", "en", "fr", "de", "pt"])
    test(`acepta el idioma ${l}`, () =>
      ok(contactSchema, contact({ locale: l })));
  for (const field of [
    "name",
    "email",
    "company",
    "service",
    "message",
    "locale",
    "consent",
  ])
    test(`rechaza si falta ${field}`, () => {
      const c: any = contact();
      delete c[field];
      bad(contactSchema, c);
    });
  for (const v of [null, undefined, "texto", 5, []])
    test(`rechaza cuerpo no objeto ${JSON.stringify(v)}`, () =>
      bad(contactSchema, v));
  test("rechaza tipos incorrectos", () => {
    bad(contactSchema, contact({ name: 12345 }));
    bad(contactSchema, contact({ message: ["a"] }));
    bad(contactSchema, contact({ email: { a: 1 } }));
  });
  test("honeypot de más de 200 caracteres es inválido", () =>
    bad(contactSchema, contact({ website: "x".repeat(201) })));
});

const post = (over: Record<string, unknown> = {}) => ({
  translation_key: "mi-articulo",
  locale: "es",
  slug: "mi-articulo",
  title: "Un título válido",
  excerpt: "Un extracto suficientemente largo para pasar.",
  body: "Cuerpo del artículo ".repeat(10),
  image: "/images/mvp-studio.webp",
  image_alt: "Descripción",
  published: true,
  ...over,
});

describe("postSchema", () => {
  test("acepta un artículo válido", () => ok(postSchema, post()));
  test("acepta imagen subida", () =>
    ok(postSchema, post({ image: `/api/media/${"a".repeat(32)}.webp` })));
  const edges: [string, number, number][] = [
    ["title", LIMITS.postTitle.min, LIMITS.postTitle.max],
    ["excerpt", LIMITS.postExcerpt.min, LIMITS.postExcerpt.max],
    ["body", LIMITS.postBody.min, LIMITS.postBody.max],
    ["slug", LIMITS.postSlug.min, LIMITS.postSlug.max],
    ["translation_key", LIMITS.translationKey.min, LIMITS.translationKey.max],
  ];
  for (const [field, min, max] of edges) {
    const ch = field === "slug" || field === "translation_key" ? "a" : "x";
    test(`${field}: límites ${min}-${max}`, () => {
      ok(postSchema, post({ [field]: ch.repeat(min) }));
      ok(postSchema, post({ [field]: ch.repeat(max) }));
      bad(postSchema, post({ [field]: ch.repeat(max + 1) }));
      if (min > 1) bad(postSchema, post({ [field]: ch.repeat(min - 1) }));
      else bad(postSchema, post({ [field]: "" }));
    });
  }
  test("image_alt: 200 válido, 201 inválido", () => {
    ok(postSchema, post({ image_alt: "a".repeat(200) }));
    bad(postSchema, post({ image_alt: "a".repeat(201) }));
  });
  for (const slug of [
    "Mayus",
    "con espacio",
    "con_guion_bajo",
    "ñandú",
    "../etc",
    "a/b",
  ])
    test(`rechaza slug ${JSON.stringify(slug)}`, () =>
      bad(postSchema, post({ slug })));
  for (const image of [
    "https://evil.example/x.webp",
    "/images/../secret.webp",
    "/images/x.svg",
    "/api/media/XYZ.webp",
    "javascript:alert(1)",
    "",
  ])
    test(`rechaza imagen ${JSON.stringify(image)}`, () =>
      bad(postSchema, post({ image })));
  test("rechaza controles en título y NUL en cuerpo", () => {
    bad(postSchema, post({ title: "Título\u0000raro" }));
    bad(postSchema, post({ body: "x".repeat(100) + "\u0000" }));
    bad(postSchema, post({ excerpt: "Extracto con\nsalto de línea largo" }));
  });
  test("el cuerpo admite saltos de línea", () =>
    ok(postSchema, post({ body: "Línea uno del cuerpo.\n\n".repeat(10) })));
  test("rechaza locale, published y campos extra inválidos", () => {
    bad(postSchema, post({ locale: "it" }));
    bad(postSchema, post({ published: "yes" }));
    bad(postSchema, post({ extra: 1 }));
  });
});

const settings = (over: Record<string, unknown> = {}) => ({
  headline: "Software a medida para tu empresa",
  description: "Diseñamos y construimos productos digitales.",
  image: "/images/business-collaboration.webp",
  services: [{ title: "MVP", description: "Validamos tu idea rápido." }],
  ...over,
});

describe("settingsSchema", () => {
  test("acepta configuración válida", () => ok(settingsSchema, settings()));
  test("1 y 12 servicios válidos; 0 y 13 inválidos", () => {
    const s = (n: number) =>
      Array.from({ length: n }, () => ({
        title: "MVP",
        description: "Validamos tu idea.",
      }));
    ok(settingsSchema, settings({ services: s(1) }));
    ok(settingsSchema, settings({ services: s(12) }));
    bad(settingsSchema, settings({ services: s(0) }));
    bad(settingsSchema, settings({ services: s(13) }));
  });
  test("límites de headline y description", () => {
    ok(settingsSchema, settings({ headline: "x".repeat(180) }));
    bad(settingsSchema, settings({ headline: "x".repeat(181) }));
    bad(settingsSchema, settings({ headline: "x".repeat(9) }));
    ok(settingsSchema, settings({ description: "x".repeat(400) }));
    bad(settingsSchema, settings({ description: "x".repeat(401) }));
    bad(settingsSchema, settings({ description: "x".repeat(19) }));
  });
  test("límites de título y descripción de servicio", () => {
    const svc = (title: string, description: string) =>
      settings({ services: [{ title, description }] });
    ok(settingsSchema, svc("x".repeat(90), "x".repeat(250)));
    bad(settingsSchema, svc("x".repeat(91), "x".repeat(10)));
    bad(settingsSchema, svc("xx", "x".repeat(251)));
    bad(settingsSchema, svc("x", "x".repeat(10)));
    bad(settingsSchema, svc("xx", "x".repeat(9)));
  });
  test("rechaza imagen externa y campos extra", () => {
    bad(settingsSchema, settings({ image: "https://x.test/a.webp" }));
    bad(settingsSchema, settings({ extra: true }));
  });
});

describe("viewSchema", () => {
  for (const path of [
    "/",
    "/en/",
    "/fr/blog",
    "/de/blog/mi-post",
    "/blog/",
    "/pt/blog/a-b-1",
  ])
    test(`acepta ${path}`, () => ok(viewSchema, { path, referrer: "" }));
  for (const path of [
    "/admin",
    "/en",
    "/en/admin",
    "//evil.test",
    "/blog/Mayus",
    "/blog/a/b",
    "x",
    "/it/",
    "/" + "a".repeat(201),
  ])
    test(`rechaza ${path.slice(0, 30)}`, () =>
      bad(viewSchema, { path, referrer: "" }));
  test("referrer de 2048 válido y 2049 inválido", () => {
    ok(viewSchema, { path: "/", referrer: "x".repeat(2048) });
    bad(viewSchema, { path: "/", referrer: "x".repeat(2049) });
  });
});

describe("loginSchema, statusSchema, idSchema, imagePath", () => {
  test("login válido y normalizado", () =>
    assert.equal(
      loginSchema.parse({ email: " ADMIN@Example.com ", password: "x" }).email,
      "admin@example.com",
    ));
  test("login rechaza correo inválido, contraseña vacía o de 201", () => {
    bad(loginSchema, { email: "no", password: "x" });
    bad(loginSchema, { email: "a@example.com", password: "" });
    bad(loginSchema, { email: "a@example.com", password: "x".repeat(201) });
    ok(loginSchema, { email: "a@example.com", password: "x".repeat(200) });
  });
  for (const s of ["new", "in-progress", "closed"])
    test(`estado ${s} válido`, () => ok(statusSchema, { status: s }));
  for (const s of ["", "done", "NEW", "cancelled", 1, null])
    test(`estado ${JSON.stringify(s)} inválido`, () =>
      bad(statusSchema, { status: s }));
  for (const id of ["1", "42", "2147483647", 7])
    test(`id ${id} válido`, () => ok(idSchema, id));
  for (const id of [
    "0",
    "-1",
    "1.5",
    "abc",
    "",
    "2147483648",
    "1e3x",
    "NaN",
    "Infinity",
  ])
    test(`id ${JSON.stringify(id)} inválido`, () => bad(idSchema, id));
  test("imagePath", () => {
    ok(imagePath, "/images/a-b_c.avif");
    bad(imagePath, "/images/a.png");
  });
});

describe("administrative password flows", () => {
  test("requires the current password and a 16-character replacement", () => {
    ok(changePasswordSchema, {
      currentPassword: "current",
      newPassword: "x".repeat(16),
    });
    bad(changePasswordSchema, {
      currentPassword: "current",
      newPassword: "x".repeat(15),
    });
  });
  test("normalizes recovery email and accepts only random hex tokens", () => {
    assert.equal(
      passwordResetRequestSchema.parse({ email: " ADMIN@example.com " }).email,
      "admin@example.com",
    );
    bad(passwordResetSchema, { token: "bad", password: "x".repeat(16) });
    ok(passwordResetSchema, {
      token: "a".repeat(64),
      password: "x".repeat(16),
    });
  });
});
