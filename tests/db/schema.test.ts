// Pruebas de base de datos: requieren Postgres (npm run test:db). No corren en CI.
import { before, after, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";

const url = process.env.DB_TEST_URL;
if (!url) throw new Error("Define DB_TEST_URL o ejecuta npm run test:db");
const pool = new Pool({ connectionString: url, max: 2 });
const schema = readFileSync(
  join(__dirname, "../../apps/api/src/schema.sql"),
  "utf8",
);
const seed = JSON.parse(
  readFileSync(join(__dirname, "../../apps/api/src/seed.json"), "utf8"),
);

const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";
const FK_VIOLATION = "23503";
const NOT_NULL_VIOLATION = "23502";

async function code(sql: string, params: unknown[] = []) {
  try {
    await pool.query(sql, params);
    return "ok";
  } catch (e: any) {
    return e.code as string;
  }
}
const expectCode = async (
  expected: string,
  sql: string,
  params: unknown[] = [],
) => assert.equal(await code(sql, params), expected, sql.slice(0, 80));

const insertContact = (over: Record<string, string> = {}) => {
  const c = {
    name: "Ana Pérez",
    email: "ana@example.com",
    company: "Acme",
    service: "MVP",
    message: "Mensaje de contacto suficientemente largo.",
    locale: "es",
    ...over,
  };
  return [
    "INSERT INTO contacts(name,email,company,service,message,locale) VALUES($1,$2,$3,$4,$5,$6)",
    [c.name, c.email, c.company, c.service, c.message, c.locale],
  ] as [string, unknown[]];
};
const insertPost = (over: Record<string, unknown> = {}) => {
  const p = {
    translation_key: "clave",
    locale: "es",
    slug: "slug",
    title: "Título válido",
    excerpt: "Extracto suficientemente largo para el límite.",
    body: "x".repeat(100),
    image: "/images/mvp-studio.webp",
    image_alt: "alt",
    ...over,
  };
  return [
    "INSERT INTO posts(translation_key,locale,slug,title,excerpt,body,image,image_alt) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
    Object.values(p),
  ] as [string, unknown[]];
};

before(async () => {
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await pool.query(schema);
});
after(() => pool.end());
beforeEach(async () => {
  await pool.query(
    "TRUNCATE sessions, admins, contacts, posts, settings, page_views RESTART IDENTITY CASCADE",
  );
});

describe("esquema", () => {
  test("es idempotente: aplicarlo dos veces no falla", async () => {
    await pool.query(schema);
    await pool.query(schema);
  });
  test("las restricciones CHECK existen y se aplican a escrituras nuevas", async () => {
    const { rows } = await pool.query(
      "SELECT count(*)::int AS n FROM pg_constraint WHERE contype='c' AND conname LIKE ANY(ARRAY['contacts_%','posts_%','admins_%','settings_%','page_views_%'])",
    );
    assert.ok(rows[0].n >= 20, `solo ${rows[0].n} restricciones`);
  });
  test("las tablas esperadas existen", async () => {
    const { rows } = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1",
    );
    assert.deepEqual(
      rows.map((r) => r.table_name),
      ["admins", "contacts", "page_views", "posts", "sessions", "settings"],
    );
  });
});

describe("contacts · éxito", () => {
  test("inserta un contacto válido con valores por defecto", async () => {
    await pool.query(...insertContact());
    const { rows } = await pool.query("SELECT * FROM contacts");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, "new");
    assert.equal(rows[0].consent_version, "2026-09");
    assert.ok(rows[0].created_at instanceof Date);
  });
  for (const name of [
    "Li",
    "José Ángel",
    "Zoë Müller",
    "李小龍",
    "Jean-Luc",
    "D’Artagnan",
    "Dr. Smith",
    "O'Brien",
  ])
    test(`acepta el nombre «${name}»`, () =>
      expectCode("ok", ...insertContact({ name })));
  test("acepta empresa vacía y con puntuación habitual", async () => {
    await expectCode("ok", ...insertContact({ company: "" }));
    await expectCode("ok", ...insertContact({ company: "Acme & Sons, S.L." }));
  });
  test("acepta mensaje multilínea", () =>
    expectCode(
      "ok",
      ...insertContact({
        message: "Línea uno del mensaje.\n\tLínea dos del mensaje.",
      }),
    ));
  test("límites exactos: nombre 100, empresa 150, servicio 100, mensaje 5000", async () => {
    await expectCode("ok", ...insertContact({ name: "a".repeat(100) }));
    await expectCode("ok", ...insertContact({ company: "a".repeat(150) }));
    await expectCode("ok", ...insertContact({ service: "a".repeat(100) }));
    await expectCode("ok", ...insertContact({ message: "a".repeat(5000) }));
  });
  for (const status of ["new", "in-progress", "closed"])
    test(`el estado ${status} es válido`, async () => {
      await pool.query(...insertContact());
      await expectCode("ok", "UPDATE contacts SET status=$1", [status]);
    });
});

describe("contacts · fracaso", () => {
  const cases: [string, Record<string, string>][] = [
    ["nombre de 1 carácter", { name: "A" }],
    ["nombre de 101 caracteres", { name: "a".repeat(101) }],
    ["nombre con espacios en los extremos", { name: " Ana " }],
    ["nombre con dígitos", { name: "Ana1" }],
    ["nombre con etiqueta HTML", { name: "<script>alert(1)</script>" }],
    ["nombre con punto y coma", { name: "Ana; DROP TABLE contacts" }],
    ["nombre con salto de línea", { name: "Ana\nPérez" }],
    ["correo sin arroba", { email: "sin-arroba.com" }],
    ["correo sin dominio", { email: "a@" }],
    ["correo con espacios", { email: "a b@example.com" }],
    ["correo en mayúsculas", { email: "ANA@EXAMPLE.COM" }],
    ["correo de 255 caracteres", { email: `${"a".repeat(243)}@example.com` }],
    ["empresa de 151 caracteres", { company: "a".repeat(151) }],
    ["empresa con etiqueta HTML", { company: "<b>Acme</b>" }],
    ["servicio de 1 carácter", { service: "M" }],
    ["servicio de 101 caracteres", { service: "a".repeat(101) }],
    ["servicio con etiqueta", { service: "<img src=x>" }],
    ["mensaje de 19 caracteres", { message: "a".repeat(19) }],
    ["mensaje de 5001 caracteres", { message: "a".repeat(5001) }],
    [
      "mensaje con carácter de control",
      { message: "Mensaje válido largo\u0007 con campana" },
    ],
    ["idioma no soportado", { locale: "it" }],
    ["idioma en mayúsculas", { locale: "ES" }],
  ];
  for (const [label, over] of cases)
    test(`rechaza ${label}`, () =>
      expectCode(CHECK_VIOLATION, ...insertContact(over)));
  test("rechaza un estado desconocido", async () => {
    await pool.query(...insertContact());
    await expectCode(CHECK_VIOLATION, "UPDATE contacts SET status='cancelled'");
    await expectCode(CHECK_VIOLATION, "UPDATE contacts SET status=''");
  });
  test("rechaza consent_version vacío o demasiado largo", async () => {
    await pool.query(...insertContact());
    await expectCode(CHECK_VIOLATION, "UPDATE contacts SET consent_version=''");
    await expectCode(
      CHECK_VIOLATION,
      "UPDATE contacts SET consent_version=repeat('x',21)",
    );
  });
  test("rechaza NULL en columnas obligatorias", async () => {
    for (const col of [
      "name",
      "email",
      "company",
      "service",
      "message",
      "locale",
    ])
      await expectCode(
        NOT_NULL_VIOLATION,
        `INSERT INTO contacts(name,email,company,service,message,locale)
        SELECT ${["name", "email", "company", "service", "message", "locale"].map((c) => (c === col ? "NULL" : "'x'")).join(",")}`,
      );
  });
  test("rechaza el byte NUL", () =>
    expectCode(
      "22021",
      ...insertContact({ message: "mensaje\u0000 con NUL largo suficiente" }),
    ));
  test("una actualización que viola la regla también se rechaza", async () => {
    await pool.query(...insertContact());
    await expectCode(CHECK_VIOLATION, "UPDATE contacts SET name='<b>'");
  });
});

describe("contacts · ciclo de vida (registro, seguimiento, baja)", () => {
  test("nuevo → en curso → cerrado → eliminado", async () => {
    await pool.query(...insertContact());
    const id = (await pool.query("SELECT id FROM contacts")).rows[0].id;
    for (const s of ["in-progress", "closed"]) {
      await pool.query("UPDATE contacts SET status=$1 WHERE id=$2", [s, id]);
      assert.equal(
        (await pool.query("SELECT status FROM contacts WHERE id=$1", [id]))
          .rows[0].status,
        s,
      );
    }
    await pool.query("DELETE FROM contacts WHERE id=$1", [id]);
    assert.equal((await pool.query("SELECT 1 FROM contacts")).rowCount, 0);
  });
  test("eliminar un contacto inexistente no afecta a otros", async () => {
    await pool.query(...insertContact());
    assert.equal(
      (await pool.query("DELETE FROM contacts WHERE id=9999")).rowCount,
      0,
    );
    assert.equal((await pool.query("SELECT 1 FROM contacts")).rowCount, 1);
  });
  test("la retención de 12 meses elimina solo los antiguos", async () => {
    await pool.query(...insertContact());
    await pool.query(...insertContact({ email: "viejo@example.com" }));
    await pool.query(
      "UPDATE contacts SET created_at=now()-interval '13 months' WHERE email='viejo@example.com'",
    );
    await pool.query(
      "DELETE FROM contacts WHERE created_at<now()-interval '12 months'",
    );
    const { rows } = await pool.query("SELECT email FROM contacts");
    assert.deepEqual(
      rows.map((r) => r.email),
      ["ana@example.com"],
    );
  });
});

describe("admins y sesiones", () => {
  const admin = (
    email: string,
    hash = "$argon2id$v=19$m=65536,t=3,p=4$abcdefgh$ijklmnopqrstuvwx",
  ) =>
    pool.query("INSERT INTO admins(email,password_hash) VALUES($1,$2)", [
      email,
      hash,
    ]);
  test("crea un admin válido", () => admin("admin@example.com"));
  test("rechaza correos inválidos o en mayúsculas", async () => {
    for (const email of ["sin-arroba", "A@EXAMPLE.COM", "a b@example.com", ""])
      await assert.rejects(admin(email), { code: CHECK_VIOLATION }, email);
  });
  test("rechaza correo duplicado", async () => {
    await admin("admin@example.com");
    await assert.rejects(admin("admin@example.com"), {
      code: UNIQUE_VIOLATION,
    });
  });
  test("rechaza hash vacío", () =>
    assert.rejects(admin("admin@example.com", ""), { code: CHECK_VIOLATION }));
  test("una sesión requiere un admin existente", async () => {
    await expectCode(
      FK_VIOLATION,
      "INSERT INTO sessions VALUES('h',999,now()+interval '1 hour')",
    );
    await admin("admin@example.com");
    const id = (await pool.query("SELECT id FROM admins")).rows[0].id;
    await expectCode(
      "ok",
      "INSERT INTO sessions VALUES('h',$1,now()+interval '1 hour')",
      [id],
    );
    await expectCode(
      UNIQUE_VIOLATION,
      "INSERT INTO sessions VALUES('h',$1,now()+interval '1 hour')",
      [id],
    );
  });
  test("no se puede borrar un admin con sesiones activas", async () => {
    await admin("admin@example.com");
    const id = (await pool.query("SELECT id FROM admins")).rows[0].id;
    await pool.query(
      "INSERT INTO sessions VALUES('h',$1,now()+interval '1 hour')",
      [id],
    );
    await expectCode(FK_VIOLATION, "DELETE FROM admins WHERE id=$1", [id]);
  });
  test("la limpieza elimina solo las sesiones caducadas", async () => {
    await admin("admin@example.com");
    const id = (await pool.query("SELECT id FROM admins")).rows[0].id;
    await pool.query(
      "INSERT INTO sessions VALUES('vieja',$1,now()-interval '1 minute'),('viva',$1,now()+interval '1 hour')",
      [id],
    );
    await pool.query("DELETE FROM sessions WHERE expires_at<now()");
    assert.deepEqual(
      (await pool.query("SELECT token_hash FROM sessions")).rows,
      [{ token_hash: "viva" }],
    );
  });
});

describe("posts", () => {
  test("inserta un artículo válido (no publicado por defecto)", async () => {
    await pool.query(...insertPost());
    assert.equal(
      (await pool.query("SELECT published FROM posts")).rows[0].published,
      false,
    );
  });
  test("acepta imagen subida y límites exactos", async () => {
    await expectCode(
      "ok",
      ...insertPost({
        image: `/api/media/${"a".repeat(32)}.webp`,
        slug: "a",
        translation_key: "a",
      }),
    );
    await expectCode(
      "ok",
      ...insertPost({
        title: "x".repeat(180),
        slug: "b",
        translation_key: "b",
      }),
    );
    await expectCode(
      "ok",
      ...insertPost({
        body: "x".repeat(60000),
        slug: "c",
        translation_key: "c",
      }),
    );
    await expectCode(
      "ok",
      ...insertPost({
        slug: "d".repeat(150),
        translation_key: "d".repeat(100),
      }),
    );
  });
  const bad: [string, Record<string, unknown>][] = [
    ["slug con mayúsculas", { slug: "Mayus" }],
    ["slug con espacios", { slug: "con espacio" }],
    ["slug vacío", { slug: "" }],
    ["slug de 151", { slug: "a".repeat(151) }],
    ["clave de traducción inválida", { translation_key: "Clave_1" }],
    ["clave de 101", { translation_key: "a".repeat(101) }],
    ["título de 4", { title: "abcd" }],
    ["título de 181", { title: "x".repeat(181) }],
    ["extracto de 19", { excerpt: "x".repeat(19) }],
    ["extracto de 321", { excerpt: "x".repeat(321) }],
    ["cuerpo de 79", { body: "x".repeat(79) }],
    ["cuerpo de 60001", { body: "x".repeat(60001) }],
    ["imagen externa", { image: "https://evil.example/x.webp" }],
    ["imagen con recorrido de directorios", { image: "/images/../x.webp" }],
    ["imagen SVG", { image: "/images/x.svg" }],
    ["texto alternativo de 201", { image_alt: "x".repeat(201) }],
    ["idioma no soportado", { locale: "it" }],
  ];
  for (const [label, over] of bad)
    test(`rechaza ${label}`, () =>
      expectCode(CHECK_VIOLATION, ...insertPost(over)));
  test("slug único por idioma; mismo slug en otro idioma permitido", async () => {
    await pool.query(...insertPost());
    await expectCode(
      UNIQUE_VIOLATION,
      ...insertPost({ translation_key: "otra" }),
    );
    await expectCode("ok", ...insertPost({ locale: "en" }));
  });
  test("una traducción por idioma y clave", async () => {
    await pool.query(...insertPost());
    await expectCode(UNIQUE_VIOLATION, ...insertPost({ slug: "otro" }));
  });
  test("publicar y despublicar", async () => {
    await pool.query(...insertPost());
    await pool.query("UPDATE posts SET published=true");
    assert.equal(
      (await pool.query("SELECT 1 FROM posts WHERE published")).rowCount,
      1,
    );
    await pool.query("UPDATE posts SET published=false");
    assert.equal(
      (await pool.query("SELECT 1 FROM posts WHERE published")).rowCount,
      0,
    );
  });
});

describe("settings", () => {
  const content = (over: Record<string, unknown> = {}) =>
    JSON.stringify({
      headline: "Software a medida para tu empresa",
      description: "Diseñamos y construimos productos digitales.",
      image: "/images/business-collaboration.webp",
      services: [{ title: "MVP", description: "Validamos tu idea rápido." }],
      ...over,
    });
  const put = (locale: string, c: string) =>
    ["INSERT INTO settings VALUES($1,$2)", [locale, c]] as [string, unknown[]];
  test("acepta la configuración semilla de cada idioma", async () => {
    for (const [l, c] of Object.entries(seed.settings))
      await expectCode("ok", ...put(l, JSON.stringify(c)));
  });
  test("acepta todos los artículos semilla", async () => {
    for (const p of seed.posts)
      await expectCode(
        "ok",
        ...insertPost({
          translation_key: p.key,
          locale: p.locale,
          slug: p.slug,
          title: p.title,
          excerpt: p.excerpt,
          body: p.body,
          image: p.image,
          image_alt: p.image_alt,
        }),
      );
  });
  test("rechaza un idioma no soportado", () =>
    expectCode(CHECK_VIOLATION, ...put("it", content())));
  test("rechaza idioma duplicado", async () => {
    await pool.query(...put("es", content()));
    await expectCode(UNIQUE_VIOLATION, ...put("es", content()));
  });
  const badContent: [string, Record<string, unknown>][] = [
    ["headline corto", { headline: "corto" }],
    ["headline de 181", { headline: "x".repeat(181) }],
    ["description corta", { description: "corta" }],
    ["description de 401", { description: "x".repeat(401) }],
    ["imagen externa", { image: "https://x.test/a.webp" }],
    ["sin servicios", { services: [] }],
    [
      "13 servicios",
      {
        services: Array.from({ length: 13 }, () => ({
          title: "MVP",
          description: "d",
        })),
      },
    ],
    ["servicios que no es un arreglo", { services: "MVP" }],
  ];
  for (const [label, over] of badContent)
    test(`rechaza ${label}`, () =>
      expectCode(CHECK_VIOLATION, ...put("es", content(over))));
  test("rechaza contenido que no es un objeto", async () => {
    await expectCode(CHECK_VIOLATION, ...put("es", "[]"));
    await expectCode(
      NOT_NULL_VIOLATION,
      "INSERT INTO settings VALUES('es',NULL)",
    );
  });
});

describe("page_views", () => {
  test("registra y agrega visitas por día, ruta y origen", async () => {
    const q =
      "INSERT INTO page_views(path,referrer) VALUES($1,$2) ON CONFLICT(day,path,referrer) DO UPDATE SET count=page_views.count+1";
    await pool.query(q, ["/", "direct"]);
    await pool.query(q, ["/", "direct"]);
    await pool.query(q, ["/en/", "google.com"]);
    const { rows } = await pool.query(
      "SELECT path,count FROM page_views ORDER BY path",
    );
    assert.deepEqual(rows, [
      { path: "/", count: 2 },
      { path: "/en/", count: 1 },
    ]);
  });
  for (const path of [
    "/admin",
    "//evil.test",
    "/blog/Mayus",
    "x",
    "/" + "a".repeat(201),
  ])
    test(`rechaza la ruta ${path.slice(0, 20)}`, () =>
      expectCode(
        CHECK_VIOLATION,
        "INSERT INTO page_views(path,referrer) VALUES($1,'direct')",
        [path],
      ));
  test("rechaza referrer vacío y contador no positivo", async () => {
    await expectCode(
      CHECK_VIOLATION,
      "INSERT INTO page_views(path,referrer) VALUES('/','')",
    );
    await expectCode(
      CHECK_VIOLATION,
      "INSERT INTO page_views(path,referrer,count) VALUES('/','direct',0)",
    );
  });
  test("la retención de 90 días elimina solo los antiguos", async () => {
    await pool.query(
      "INSERT INTO page_views(day,path,referrer) VALUES(CURRENT_DATE-91,'/','direct'),(CURRENT_DATE,'/','direct')",
    );
    await pool.query("DELETE FROM page_views WHERE day<CURRENT_DATE-90");
    assert.equal((await pool.query("SELECT 1 FROM page_views")).rowCount, 1);
  });
});

describe("filas antiguas (restricciones NOT VALID)", () => {
  test("una fila previa inválida no impide aplicar el esquema, pero sí se rechaza al actualizarla", async () => {
    await pool.query(
      "ALTER TABLE contacts DROP CONSTRAINT contacts_name_valid",
    );
    await pool.query(...insertContact({ name: "Nombre 123" }));
    await pool.query(schema);
    await expectCode(CHECK_VIOLATION, "UPDATE contacts SET name='Otro 456'");
    await expectCode("ok", "UPDATE contacts SET name='Nombre Válido'");
  });
});
