import { When, Then, expect } from "../../fixtures";
import { PNG_1X1 } from "../../helpers";

async function upload(
  { api, world }: any,
  name: string,
  mimeType: string,
  buffer: Buffer,
) {
  world.response = await api.post("/api/admin/upload", {
    multipart: { image: { name, mimeType, buffer } },
    failOnStatusCode: false,
  });
  world.body = await world.response.json().catch(() => undefined);
}

When("subo una imagen PNG válida", ({ api, world }) =>
  upload({ api, world }, "pixel.png", "image/png", PNG_1X1),
);
When("subo un archivo SVG", ({ api, world }) =>
  upload(
    { api, world },
    "bad.svg",
    "image/svg+xml",
    Buffer.from('<svg onload="alert(1)"></svg>'),
  ),
);
When(
  "subo un archivo con tipo PNG pero contenido que no es una imagen",
  ({ api, world }) =>
    upload(
      { api, world },
      "fake.png",
      "image/png",
      Buffer.from("esto no es una imagen"),
    ),
);
When("subo un archivo de {int} MB con tipo PNG", ({ api, world }, mb: number) =>
  upload(
    { api, world },
    "big.png",
    "image/png",
    Buffer.concat([PNG_1X1, Buffer.alloc(mb * 1024 * 1024)]),
  ),
);
When("subo un PDF", ({ api, world }) =>
  upload({ api, world }, "doc.pdf", "application/pdf", Buffer.from("%PDF-1.4")),
);
When("envío una subida sin archivo", async ({ api, world }) => {
  world.response = await api.post("/api/admin/upload", {
    multipart: { campo: "valor" },
    failOnStatusCode: false,
  });
  world.body = await world.response.json().catch(() => undefined);
});
When(
  "subo una imagen PNG sin sesión",
  async ({ playwright, baseURL, world }) => {
    const ctx = await playwright.request.newContext({
      baseURL,
      ignoreHTTPSErrors: process.env.TEST_INSECURE_TLS === "1",
      extraHTTPHeaders: {
        Origin: process.env.TEST_URL || "http://localhost:8086",
        "X-Forwarded-For": world.ip,
      },
    });
    world.response = await ctx.post("/api/admin/upload", {
      multipart: {
        image: { name: "pixel.png", mimeType: "image/png", buffer: PNG_1X1 },
      },
      failOnStatusCode: false,
    });
    await ctx.dispose();
  },
);

Then("la imagen subida se sirve como WebP", async ({ api, world }) => {
  expect(world.body.url).toMatch(/^\/api\/media\/[a-f0-9]{32}\.webp$/);
  const res = await api.get(world.body.url);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/webp");
  expect(res.headers()["cache-control"]).toContain("immutable");
});
