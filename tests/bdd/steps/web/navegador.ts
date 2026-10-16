import { Given, When, Then, Before, expect } from "../../fixtures";
import { adminEmail, adminPassword } from "../../env";
import { LIMITS } from "../../../../apps/api/src/validation";
import { findContact, unique, validContact } from "../../helpers";

const SUCCESS: Record<string, string> = {
  es: "Tu idea ya está en nuestra bandeja",
  en: "Your idea is in our inbox",
  fr: "Votre idée est bien arrivée",
  de: "Ihre Idee ist eingegangen",
  pt: "Sua ideia já está na nossa caixa de entrada",
};
const ERROR: Record<string, string> = {
  es: "No pudimos enviar tu solicitud",
  en: "We couldn’t send your request",
  fr: "Impossible d'envoyer votre demande",
  de: "Ihre Anfrage konnte nicht gesendet werden",
  pt: "Não foi possível enviar sua solicitação",
};
const home = (lang: string) => (lang === "es" ? "/" : `/${lang}/`);

// Sin analítica externa durante las pruebas.
Before(async ({ context }) => {
  await context.route("https://stats.yunitztech.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "/* mock */",
    }),
  );
});

// ── Sitio público ───────────────────────────────────────────────────────────
Given(
  "que abro la portada en {string}",
  async ({ page, world }, lang: string) => {
    world.vars.lang = lang;
    const res = await page.goto(home(lang));
    expect(res?.status()).toBe(200);
  },
);
Given("que abro el blog en {string}", async ({ page, world }, lang: string) => {
  world.vars.lang = lang;
  await page.goto(lang === "es" ? "/blog" : `/${lang}/blog`);
});
When("abro la ruta {string}", async ({ page, world }, path: string) => {
  world.response = (await page.goto(path)) as any;
});

Then("la página declara el idioma {string}", async ({ page }, lang: string) => {
  await expect(page.locator("html")).toHaveAttribute("lang", lang);
});
Then(
  "la página tiene un encabezado principal y el formulario de contacto",
  async ({ page }) => {
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.locator("#contact-form")).toBeAttached();
  },
);
Then(
  "la página enlaza versiones alternativas para los 5 idiomas",
  async ({ page }) => {
    const langs = await page
      .locator('link[rel="alternate"][hreflang]')
      .evaluateAll((els) => els.map((e) => e.getAttribute("hreflang")));
    for (const l of ["es", "en", "fr", "de", "pt", "x-default"])
      expect(langs).toContain(l);
  },
);
Then(
  "el navegador recibe el estado {int}",
  async ({ world }, status: number) => {
    expect((world.response as any).status()).toBe(status);
  },
);
Then(
  "la página muestra el encabezado {string}",
  async ({ page }, text: string) => {
    await expect(page.locator("h1").first()).toContainText(text);
  },
);
Then("el blog lista al menos un artículo", async ({ page }) => {
  await expect(page.locator("a[href*='/blog/']").first()).toBeVisible();
});
When("abro el primer artículo del blog", async ({ page }) => {
  const link = page.locator("main a[href*='/blog/']").first();
  await link.click();
  await expect(page.locator("h1").first()).toBeVisible();
});
Then("el artículo muestra título y contenido", async ({ page }) => {
  await expect(page.locator("h1").first()).not.toBeEmpty();
  expect((await page.locator("main").innerText()).length).toBeGreaterThan(200);
});

// ── Formulario de contacto ──────────────────────────────────────────────────
async function fill(page: any, world: any, over: Record<string, string> = {}) {
  const c: any = validContact(world.vars);
  const values = {
    name: c.name,
    email: c.email,
    company: c.company,
    message: c.message,
    ...over,
  };
  for (const [k, v] of Object.entries(values))
    await page.locator(`#contact-form [name=${k}]`).fill(v);
  const select = page.locator("#contact-form [name=service]");
  await select.selectOption({ index: 1 });
}
When(
  "completo el formulario de contacto con datos válidos",
  async ({ page, world }) => fill(page, world),
);
When(
  "completo el formulario de contacto con el campo {string} igual a {string}",
  async ({ page, world }, field: string, value: string) =>
    fill(page, world, { [field]: value }),
);
When("acepto la política de privacidad", async ({ page }) => {
  await page.locator("#contact-form [name=consent]").check();
});
When("envío el formulario", async ({ page, world }) => {
  world.vars.requests = [] as string[];
  page.on("request", (r) => {
    if (r.url().endsWith("/api/contact")) world.vars.requests.push(r.method());
  });
  await page.locator("#contact-form button[type=submit]").click();
});
Then(
  "el formulario confirma el envío en {string}",
  async ({ page }, lang: string) => {
    await expect(page.locator("#form-status")).toContainText(SUCCESS[lang]);
  },
);
Then(
  "el formulario muestra el error de envío en {string}",
  async ({ page }, lang: string) => {
    await expect(page.locator("#form-status")).toContainText(ERROR[lang]);
  },
);
Then("no se envía ninguna petición al servidor", async ({ page, world }) => {
  await page.waitForTimeout(300);
  expect(world.vars.requests).toEqual([]);
});
Then("el formulario no es válido para el navegador", async ({ page }) => {
  expect(
    await page
      .locator("#contact-form")
      .evaluate((f: HTMLFormElement) => f.checkValidity()),
  ).toBe(false);
});
Then(
  "el contacto enviado figura en la bandeja del administrador",
  async ({ admin, world }) => {
    await expect
      .poll(async () => !!(await findContact(admin, world.vars.contactEmail)))
      .toBe(true);
  },
);
Then(
  "el contacto enviado no figura en la bandeja del administrador",
  async ({ admin, world }) => {
    expect(await findContact(admin, world.vars.contactEmail)).toBeUndefined();
  },
);

const LIMIT_OF: Record<string, { min?: number; max: number }> = {
  name: LIMITS.name,
  email: LIMITS.email,
  company: LIMITS.company,
  message: LIMITS.message,
  slug: LIMITS.postSlug,
  translation_key: LIMITS.translationKey,
  title: LIMITS.postTitle,
  excerpt: LIMITS.postExcerpt,
  body: LIMITS.postBody,
  image_alt: LIMITS.imageAlt,
  headline: LIMITS.headline,
  description: LIMITS.description,
};
Then(
  "el campo {string} de {string} respeta los límites del backend",
  async ({ page }, field: string, formSel: string) => {
    const { min, max } = LIMIT_OF[field];
    const input = page.locator(`${formSel} [name=${field}]`);
    await expect(input).toHaveAttribute("maxlength", String(max));
    if (min && min > 1)
      await expect(input).toHaveAttribute("minlength", String(min));
  },
);

// ── Panel de administración (UI) ────────────────────────────────────────────
Given("que abro el panel de administración", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.locator("#login-panel")).toBeVisible();
});
async function uiLogin(page: any, email: string, password: string) {
  await page.getByLabel("Correo de administración").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
}
When("inicio sesión con las credenciales de administrador", async ({ page }) =>
  uiLogin(page, adminEmail, adminPassword),
);
When("inicio sesión con una contraseña incorrecta", async ({ page }) =>
  uiLogin(page, adminEmail, "contraseña-incorrecta-" + unique()),
);
Given("que inicié sesión en el panel", async ({ page }) => {
  await page.goto("/admin");
  await uiLogin(page, adminEmail, adminPassword);
  await expect(page.locator("#dashboard")).toBeVisible();
});
Then("veo el panel de administración", async ({ page }) => {
  await expect(page.locator("#dashboard")).toBeVisible();
  await expect(page.locator("#login-panel")).toBeHidden();
});
Then("sigo viendo el formulario de acceso con un error", async ({ page }) => {
  await expect(page.locator("#login-panel")).toBeVisible();
  await expect(page.locator("#dashboard")).toBeHidden();
  await expect(page.locator("#admin-status")).toContainText(
    /Credenciales incorrectas|Invalid credentials/,
  );
});
When("cierro sesión desde el panel", async ({ page }) => {
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
});
Then("vuelvo al formulario de acceso", async ({ page }) => {
  await expect(page.locator("#login-panel")).toBeVisible();
});
Then("recargar el panel no restablece la sesión", async ({ page }) => {
  await page.reload();
  await expect(page.locator("#login-panel")).toBeVisible();
});

When("abro la pestaña {string}", async ({ page }, name: string) => {
  await page.getByRole("button", { name, exact: true }).click();
});
function card(page: any, world: any) {
  return page
    .locator("#contact-list article")
    .filter({ hasText: world.vars.contactEmail })
    .first();
}
Then(
  "la solicitud aparece en la bandeja del panel",
  async ({ page, world }) => {
    await expect(card(page, world)).toContainText("Negocio de prueba");
  },
);
When(
  "cambio el estado de la solicitud a {string} en el panel",
  async ({ page, world }, status: string) => {
    await card(page, world).getByLabel("Estado").selectOption(status);
    await expect(page.locator("#admin-status")).toContainText(
      "Estado actualizado",
    );
  },
);
When("elimino la solicitud desde el panel", async ({ page, world }) => {
  page.once("dialog", (d) => d.accept());
  await card(page, world)
    .getByRole("button", { name: "Eliminar solicitud" })
    .click();
  await expect(page.locator("#admin-status")).toContainText(
    "Solicitud eliminada",
  );
});
Then(
  "la solicitud tiene el estado {string} en el servidor",
  async ({ admin, world }, status: string) => {
    await expect
      .poll(
        async () => (await findContact(admin, world.vars.contactEmail))?.status,
      )
      .toBe(status);
  },
);
Then("la solicitud ya no existe en el servidor", async ({ admin, world }) => {
  await expect
    .poll(async () => await findContact(admin, world.vars.contactEmail))
    .toBeUndefined();
});
Then(
  "el panel muestra la solicitud filtrada por estado {string}",
  async ({ page, world }, status: string) => {
    await page.locator("#contact-filter").selectOption(status);
    await expect(card(page, world)).toBeVisible();
  },
);
When(
  "elimino la solicitud pero cancelo la confirmación",
  async ({ page, world }) => {
    page.once("dialog", (d) => d.dismiss());
    await card(page, world)
      .getByRole("button", { name: "Eliminar solicitud" })
      .click();
  },
);
Then(
  "la solicitud sigue existiendo en el servidor",
  async ({ admin, world }) => {
    expect(await findContact(admin, world.vars.contactEmail)).toBeTruthy();
  },
);
