import { After, When, Then, expect } from "../../fixtures";

const services = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    title: `Servicio ${i + 1}`,
    description: `Descripción del servicio ${i + 1}.`,
  }));

When(
  "guardo la configuración original de {string}",
  async ({ api, world }, locale: string) => {
    const res = await api.get(`/api/site/${locale}`);
    expect(res.status()).toBe(200);
    world.vars.originalSettings = { locale, content: await res.json() };
  },
);
When(
  "actualizo la configuración de {string} con titular {string} y {int} servicios",
  async ({ api, world }, locale: string, headline: string, n: number) => {
    const base = world.vars.originalSettings.content;
    world.response = await api.put(`/api/admin/site/${locale}`, {
      data: { ...base, headline, services: services(n) },
      failOnStatusCode: false,
    });
    world.body = await world.response.json().catch(() => undefined);
  },
);
When(
  "actualizo la configuración de {string} con el titular de {int} caracteres",
  async ({ api, world }, locale: string, n: number) => {
    const base = world.vars.originalSettings.content;
    world.response = await api.put(`/api/admin/site/${locale}`, {
      data: { ...base, headline: "x".repeat(n) },
      failOnStatusCode: false,
    });
    world.body = await world.response.json().catch(() => undefined);
  },
);
When(
  "actualizo la configuración de {string} con la descripción de {int} caracteres",
  async ({ api, world }, locale: string, n: number) => {
    const base = world.vars.originalSettings.content;
    world.response = await api.put(`/api/admin/site/${locale}`, {
      data: { ...base, description: "x".repeat(n) },
      failOnStatusCode: false,
    });
    world.body = await world.response.json().catch(() => undefined);
  },
);
When(
  "actualizo la configuración de {string} con la imagen {string}",
  async ({ api, world }, locale: string, image: string) => {
    const base = world.vars.originalSettings.content;
    world.response = await api.put(`/api/admin/site/${locale}`, {
      data: { ...base, image },
      failOnStatusCode: false,
    });
    world.body = await world.response.json().catch(() => undefined);
  },
);
When("restauro la configuración original", async ({ api, world }) => {
  const { locale, content } = world.vars.originalSettings;
  world.response = await api.put(`/api/admin/site/${locale}`, {
    data: content,
  });
  world.vars.restored = true;
});

Then(
  "la configuración pública de {string} tiene el titular {string}",
  async ({ api }, locale: string, headline: string) => {
    const body = await (await api.get(`/api/site/${locale}`)).json();
    expect(body.headline).toBe(headline);
  },
);
Then(
  "la configuración pública de {string} no cambió",
  async ({ api, world }, locale: string) => {
    expect(await (await api.get(`/api/site/${locale}`)).json()).toEqual(
      world.vars.originalSettings.content,
    );
  },
);
Then(
  "la configuración pública tiene titular, descripción, imagen y al menos un servicio",
  async ({ world }) => {
    const b = world.body;
    expect(typeof b.headline).toBe("string");
    expect(typeof b.description).toBe("string");
    expect(b.image).toMatch(/^\//);
    expect(b.services.length).toBeGreaterThan(0);
  },
);

// Red de seguridad: si el escenario falla a mitad, deja la configuración como estaba.
After({ tags: "@settings" }, async ({ api, world }) => {
  const o = world.vars.originalSettings;
  if (o && !world.vars.restored)
    await api.put(`/api/admin/site/${o.locale}`, {
      data: o.content,
      failOnStatusCode: false,
    });
});
