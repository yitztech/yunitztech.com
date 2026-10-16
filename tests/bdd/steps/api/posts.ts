import { After, When, Then, expect } from "../../fixtures";
import { applyOverride, validPost } from "../../helpers";

type Created = { id: number; payload: Record<string, any> };
const created = (vars: Record<string, any>): Created[] => (vars.created ??= []);

async function call(
  { api, world }: any,
  method: "post" | "put",
  path: string,
  body: unknown,
) {
  world.response = await api[method](path, {
    data: body,
    failOnStatusCode: false,
  });
  world.body = await world.response.json().catch(() => undefined);
}

When("creo un artículo borrador válido", async ({ api, world }) => {
  const payload = validPost(world.vars);
  await call({ api, world }, "post", "/api/admin/posts", payload);
  if (world.response.status() === 201) {
    created(world.vars).push({ id: world.body.id, payload });
    world.vars.postId = world.body.id;
    world.vars.slug = payload.slug;
    world.vars.payload = payload;
  }
});
When(
  "creo un artículo con el campo {string} igual a {string}",
  async ({ api, world }, field: string, value: string) => {
    const payload = applyOverride(validPost(world.vars), field, value);
    await call({ api, world }, "post", "/api/admin/posts", payload);
    if (world.response.status() === 201)
      created(world.vars).push({ id: world.body.id, payload: payload as any });
  },
);
When(
  "creo un artículo con un campo desconocido {string}",
  async ({ api, world }, field: string) =>
    call({ api, world }, "post", "/api/admin/posts", {
      ...validPost(world.vars),
      [field]: "x",
    }),
);
When("creo otro artículo con el mismo slug", async ({ api, world }) =>
  call({ api, world }, "post", "/api/admin/posts", {
    ...validPost(world.vars),
    translation_key: `otra-${world.vars.postKey}`,
  }),
);
When(
  "creo la traducción {string} del artículo",
  async ({ api, world }, locale: string) => {
    const payload: Record<string, any> = {
      ...validPost(world.vars, locale),
      published: true,
    };
    await call({ api, world }, "post", "/api/admin/posts", payload);
    if (world.response.status() === 201) {
      created(world.vars).push({ id: world.body.id, payload });
      world.vars[`slug_${locale}`] = payload.slug;
    }
  },
);
When("{word} el artículo", async ({ api, world }, action: string) => {
  const published = action === "publico";
  if (!["publico", "despublico"].includes(action))
    throw new Error(`Acción desconocida: ${action}`);
  const entry = created(world.vars)[0];
  entry.payload = { ...entry.payload, published };
  await call(
    { api, world },
    "put",
    `/api/admin/posts/${entry.id}`,
    entry.payload,
  );
});
When(
  "cambio el título del artículo a {string}",
  async ({ api, world }, title: string) => {
    const entry = created(world.vars)[0];
    entry.payload = { ...entry.payload, title };
    await call(
      { api, world },
      "put",
      `/api/admin/posts/${entry.id}`,
      entry.payload,
    );
  },
);
When(
  "actualizo el artículo con el campo {string} igual a {string}",
  async ({ api, world }, field: string, value: string) => {
    const entry = created(world.vars)[0];
    await call(
      { api, world },
      "put",
      `/api/admin/posts/${entry.id}`,
      applyOverride(entry.payload, field, value),
    );
  },
);

Then(
  "el artículo {string} es visible públicamente",
  async ({ api, world }, locale: string) => {
    const slug =
      locale === "es" ? world.vars.slug : world.vars[`slug_${locale}`];
    const res = await api.get(`/api/post/${locale}/${slug}`);
    expect(res.status()).toBe(200);
    world.body = await res.json();
  },
);
Then(
  "el artículo {string} no es visible públicamente",
  async ({ api, world }, locale: string) => {
    const slug =
      locale === "es" ? world.vars.slug : world.vars[`slug_${locale}`];
    expect((await api.get(`/api/post/${locale}/${slug}`)).status()).toBe(404);
  },
);
Then(
  "el artículo aparece en el listado público de {string}",
  async ({ api, world }, locale: string) => {
    const list = await (await api.get(`/api/posts/${locale}`)).json();
    expect(list.map((p: any) => p.slug)).toContain(world.vars.slug);
  },
);
Then(
  "el artículo no aparece en el listado público de {string}",
  async ({ api, world }, locale: string) => {
    const list = await (await api.get(`/api/posts/${locale}`)).json();
    expect(list.map((p: any) => p.slug)).not.toContain(world.vars.slug);
  },
);
Then(
  "el artículo público enlaza sus traducciones {string}",
  async ({ world }, locales: string) => {
    const got = (world.body.translations as any[]).map((t) => t.locale).sort();
    expect(got).toEqual(locales.split(",").sort());
  },
);
Then(
  "el artículo público tiene el título {string}",
  async ({ api, world }, title: string) => {
    const res = await (await api.get(`/api/post/es/${world.vars.slug}`)).json();
    expect(res.title).toBe(title);
  },
);
Then(
  "el listado público no expone el cuerpo ni los borradores",
  async ({ api }) => {
    const list = await (await api.get("/api/posts/es")).json();
    for (const p of list) expect(p).not.toHaveProperty("body");
  },
);

// Los artículos no se pueden borrar por API: se despublican al terminar.
After({ tags: "@posts" }, async ({ api, world }) => {
  for (const c of created(world.vars))
    await api.put(`/api/admin/posts/${c.id}`, {
      data: { ...c.payload, published: false },
      failOnStatusCode: false,
    });
});
