import { When, Then, expect } from "../../fixtures";
import {
  applyOverride,
  expand,
  findContact,
  validContact,
} from "../../helpers";

async function submit({ api, world }: any, body: Record<string, unknown>) {
  world.response = await api.post("/api/contact", {
    data: body,
    failOnStatusCode: false,
  });
  world.body = await world.response.json().catch(() => undefined);
}

When("envío una solicitud de contacto válida", async ({ api, world }) =>
  submit({ api, world }, validContact(world.vars)),
);
When(
  "envío una solicitud de contacto con el campo {string} igual a {string}",
  async ({ api, world }, field: string, value: string) =>
    submit(
      { api, world },
      applyOverride(validContact(world.vars), field, value),
    ),
);
When(
  "envío una solicitud de contacto con el campo desconocido {string}",
  async ({ api, world }, field: string) =>
    submit({ api, world }, { ...validContact(world.vars), [field]: "x" }),
);
When(
  "envío {int} solicitudes de contacto válidas",
  async ({ api, world }, n: number) => {
    world.vars.statuses = [];
    for (let i = 0; i < n; i++) {
      await submit({ api, world }, validContact(world.vars));
      world.vars.statuses.push(world.response.status());
    }
  },
);
Then(
  "la última de ellas fue rechazada por límite de tasa",
  async ({ world }) => {
    const s: number[] = world.vars.statuses;
    expect(s.slice(0, 5)).toEqual([201, 201, 201, 201, 201]);
    expect(s.at(-1)).toBe(429);
  },
);

Then(
  "el contacto aparece en la bandeja del administrador con estado {string}",
  async ({ admin, world }, status: string) => {
    const c = await findContact(admin, world.vars.contactEmail);
    expect(c, "contacto no encontrado en la bandeja").toBeTruthy();
    expect(c.status).toBe(status);
    world.vars.contactId = c.id;
  },
);
Then(
  "el contacto no aparece en la bandeja del administrador",
  async ({ admin, world }) => {
    expect(await findContact(admin, world.vars.contactEmail)).toBeUndefined();
  },
);
Then(
  "el contacto guardado conserva el nombre {string}",
  async ({ admin, world }, name: string) => {
    expect((await findContact(admin, world.vars.contactEmail)).name).toBe(name);
  },
);
Then(
  "existe en la bandeja un contacto con el correo {string}",
  async ({ admin }, email: string) => {
    expect(
      await findContact(admin, email),
      `sin contacto ${email}`,
    ).toBeTruthy();
  },
);

When(
  "cambio el estado del contacto a {string}",
  async ({ api, world }, status: string) => {
    world.response = await api.put(
      `/api/admin/contact/${world.vars.contactId}`,
      {
        data: { status: expand(status) },
        failOnStatusCode: false,
      },
    );
    world.body = await world.response.json().catch(() => undefined);
  },
);
When("elimino el contacto", async ({ api, world }) => {
  world.response = await api.delete(
    `/api/admin/contact/${world.vars.contactId}`,
    {
      failOnStatusCode: false,
    },
  );
  world.body = await world.response.json().catch(() => undefined);
});
