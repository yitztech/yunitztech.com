// Routing of the admin panel on its own host (ADMIN_HOST), against the production gateway.
// Usage: node scripts/check-admin-host.mjs GATEWAY_URL ADMIN_HOST SITE_URL
// ADMIN_EMAIL and ADMIN_PASSWORD come from the environment.
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

const [gatewayUrl, adminHost, siteUrl] = process.argv.slice(2);
if (!gatewayUrl || !adminHost || !siteUrl) {
  throw new Error(
    "Usage: node check-admin-host.mjs GATEWAY_URL ADMIN_HOST SITE_URL",
  );
}
const gateway = new URL(gatewayUrl);
const adminOrigin = `https://${adminHost}`;
const siteHost = new URL(siteUrl).host;

function request(host, path, { method = "GET", body, origin } = {}) {
  return new Promise((resolve, reject) => {
    const headers = { host };
    if (origin) headers.origin = origin;
    if (body) headers["content-type"] = "application/json";
    const req = http.request(
      { hostname: gateway.hostname, port: gateway.port, path, method, headers },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (text += chunk));
        res.on("end", () =>
          resolve({ status: res.statusCode, headers: res.headers, text }),
        );
      },
    );
    req.on("error", reject);
    req.end(body ? JSON.stringify(body) : undefined);
  });
}

test("the admin host serves the panel at / with its assets", async () => {
  const page = await request(adminHost, "/");
  assert.equal(page.status, 200);
  assert.match(page.text, /id="login"/);
  assert.equal(page.headers["x-robots-tag"], "noindex, nofollow");
  const asset = page.text.match(/(?:src|href)="(\/_astro\/[^"]+)"/)?.[1];
  assert.ok(asset, "the panel references a built asset");
  assert.equal((await request(adminHost, asset)).status, 200);
});

test("the admin host keeps search engines and public pages out", async () => {
  const robots = await request(adminHost, "/robots.txt");
  assert.equal(robots.status, 200);
  assert.doesNotMatch(robots.text, /^Disallow:\s*\S/m);
  assert.equal(robots.headers["x-robots-tag"], "noindex, nofollow");
  const old = await request(adminHost, "/admin");
  assert.equal(old.status, 301);
  assert.equal(old.headers.location, "/");
  const blog = await request(adminHost, "/blog?page=2");
  assert.equal(blog.status, 301);
  assert.equal(
    blog.headers.location,
    `${siteUrl.replace(/\/$/, "")}/blog?page=2`,
  );
  assert.equal(
    (await request(adminHost, "/api/view", { method: "POST", body: {} }))
      .status,
    204,
  );
});

test("login works on the admin host and its origin is accepted", async () => {
  const wrong = await request(adminHost, "/api/login", {
    method: "POST",
    origin: adminOrigin,
    body: { email: process.env.ADMIN_EMAIL, password: "not-the-password-0000" },
  });
  assert.equal(wrong.status, 401);
  const right = await request(adminHost, "/api/login", {
    method: "POST",
    origin: adminOrigin,
    body: {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    },
  });
  assert.ok(
    right.status === 200 || right.status === 201,
    `login status ${right.status}`,
  );
  assert.match(String(right.headers["set-cookie"]), /session=.*Path=\/api/);
});

test("the site host redirects the old panel URL and hides the admin API", async () => {
  const old = await request(siteHost, "/admin");
  assert.equal(old.status, 301);
  assert.equal(old.headers.location, `${adminOrigin}/`);
  for (const path of [
    "/api/login",
    "/api/password-reset/request",
    "/api/admin/data",
  ]) {
    const res = await request(siteHost, path, {
      method: "POST",
      origin: siteUrl,
      body: {},
    });
    assert.equal(res.status, 404, path);
  }
  assert.equal((await request(siteHost, "/")).status, 200);
  assert.equal((await request(siteHost, "/api/health")).status, 200);
});
