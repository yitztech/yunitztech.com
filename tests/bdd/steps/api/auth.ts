import { When, Then, expect } from "../../fixtures";
import { adminEmail, adminPassword } from "../../env";
import { applyOverride } from "../../helpers";

async function login({ api, world }: any, body: Record<string, unknown>) {
  world.response = await api.post("/api/login", {
    data: body,
    failOnStatusCode: false,
  });
  world.body = await world.response.json().catch(() => undefined);
}
const sessionToken = (setCookie: string) =>
  /session=([^;]+)/.exec(setCookie)?.[1];

When("inicio sesión con las credenciales correctas", async ({ api, world }) => {
  await login({ api, world }, { email: adminEmail, password: adminPassword });
  const token = sessionToken(world.response.headers()["set-cookie"] ?? "");
  if (token) world.vars.token = token;
});
When(
  "inicio sesión con el correo {string} y la contraseña {string}",
  async ({ api, world }, email: string, password: string) =>
    login({ api, world }, { email, password }),
);
When(
  "inicio sesión con el campo {string} igual a {string}",
  async ({ api, world }, field: string, value: string) =>
    login(
      { api, world },
      applyOverride(
        { email: adminEmail, password: adminPassword },
        field,
        value,
      ),
    ),
);
When(
  "inicio sesión con las credenciales correctas en mayúsculas",
  async ({ api, world }) =>
    login(
      { api, world },
      { email: adminEmail.toUpperCase(), password: adminPassword },
    ),
);
When(
  "intento iniciar sesión {int} veces con una contraseña incorrecta",
  async ({ api, world }, n: number) => {
    world.vars.statuses = [];
    for (let i = 0; i < n; i++) {
      await login(
        { api, world },
        { email: adminEmail, password: "incorrecta-" + i },
      );
      world.vars.statuses.push(world.response.status());
    }
  },
);
When("cierro sesión", async ({ api, world }) => {
  world.response = await api.post("/api/logout");
});
When(
  "consulto el panel con el token de sesión anterior",
  async ({ api, world }) => {
    world.response = await api.get("/api/admin/data", {
      headers: { Cookie: `session=${world.vars.token}` },
      failOnStatusCode: false,
    });
  },
);
When(
  "consulto el panel con una cookie de sesión falsa",
  async ({ api, world }) => {
    world.response = await api.get("/api/admin/data", {
      headers: { Cookie: `session=${"0".repeat(64)}` },
      failOnStatusCode: false,
    });
  },
);

Then(
  "la cookie de sesión es HttpOnly, SameSite=Strict y limitada a la ruta de la API",
  async ({ world }) => {
    const cookie = world.response.headers()["set-cookie"] ?? "";
    expect(cookie).toContain("session=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain("Path=/api");
    if (process.env.TEST_PRODUCTION === "1") expect(cookie).toContain("Secure");
  },
);
Then("no se establece ninguna cookie de sesión", async ({ world }) => {
  expect(world.response.headers()["set-cookie"] ?? "").not.toContain(
    "session=",
  );
});
Then(
  "el mensaje de error es el mismo que con un usuario inexistente",
  async ({ api, world }) => {
    const other = await api.post("/api/login", {
      data: { email: "no-existe@example.test", password: "incorrecta-1234" },
      failOnStatusCode: false,
    });
    expect((await other.json()).error).toBe(world.body.error);
  },
);
Then(
  "el panel responde con el estado {int}",
  async ({ api }, status: number) => {
    expect(
      (await api.get("/api/admin/data", { failOnStatusCode: false })).status(),
    ).toBe(status);
  },
);
Then(
  "la última respuesta fue rechazada por límite de tasa",
  async ({ world }) => {
    const s: number[] = world.vars.statuses;
    expect(s.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(s.at(-1)).toBe(429);
  },
);
