import { Given, When, Then, expect } from "../../fixtures";
import { adminLogin, expand, interpolate } from "../../helpers";

Given("que soy administrador autenticado", async ({ api }) => {
  await adminLogin(api);
});
Given("que no he iniciado sesión", async () => {});

async function send(
  { api, world }: any,
  method: string,
  path: string,
  extra: { data?: string; headers?: Record<string, string> } = {},
) {
  const url = interpolate(path, world.vars);
  const options: any = { headers: extra.headers, failOnStatusCode: false };
  if (extra.data !== undefined) {
    options.headers = { "Content-Type": "application/json", ...extra.headers };
    options.data = String(expand(interpolate(extra.data, world.vars)));
  }
  world.response = await api.fetch(url, {
    method: method.toUpperCase(),
    ...options,
  });
  world.body = await world.response.json().catch(() => undefined);
}

When(
  "hago {word} a {string}",
  async ({ api, world }, method: string, path: string) =>
    send({ api, world }, method, path),
);
When(
  "envío {word} a {string} con el JSON:",
  async ({ api, world }, method: string, path: string, doc: string) =>
    send({ api, world }, method, path, { data: doc }),
);
When(
  "envío {word} a {string} desde el origen {string} con el JSON:",
  async (
    { api, world },
    method: string,
    path: string,
    origin: string,
    doc: string,
  ) =>
    send({ api, world }, method, path, {
      data: doc,
      headers: { Origin: origin },
    }),
);
When(
  "envío {word} a {string} con el texto crudo {string}",
  async ({ api, world }, method: string, path: string, raw: string) =>
    send({ api, world }, method, path, { data: raw }),
);

Then(
  "la respuesta tiene el estado {int}",
  async ({ world }, status: number) => {
    expect(world.response.status(), JSON.stringify(world.body)).toBe(status);
  },
);
Then(
  "el cuerpo incluye el campo {string}",
  async ({ world }, field: string) => {
    expect(world.body).toHaveProperty(field);
  },
);
Then(
  "el cuerpo no incluye el campo {string}",
  async ({ world }, field: string) => {
    expect(world.body ?? {}).not.toHaveProperty(field);
  },
);
Then(
  "el campo {string} del cuerpo es {string}",
  async ({ world }, field: string, value: string) => {
    expect(String(world.body?.[field])).toBe(value);
  },
);
Then("el error señala el campo {string}", async ({ world }, field: string) => {
  expect(world.body?.fields, JSON.stringify(world.body)).toContain(field);
});
Then(
  "la cabecera {string} de la respuesta contiene {string}",
  async ({ world }, name: string, text: string) => {
    expect(world.response.headers()[name.toLowerCase()] ?? "").toContain(text);
  },
);
Then(
  "guardo el campo {string} del cuerpo como {string}",
  async ({ world }, field: string, key: string) => {
    expect(world.body, JSON.stringify(world.body)).toHaveProperty(field);
    world.vars[key] = world.body[field];
  },
);
