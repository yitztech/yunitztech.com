import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import {
  Module,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Req,
  Res,
} from "@nestjs/common";
import { randomBytes, createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import argon2 from "argon2";
import sharp from "sharp";
import { ZodError } from "zod";
import { db } from "./db";
import { runMigrations } from "./migrations";
import {
  sendAdminPasswordReset,
  startContactNotificationWorker,
} from "./contact-notifications";
import {
  contactSchema,
  changePasswordSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  idSchema,
  locale,
  loginSchema,
  postSchema,
  settingsSchema,
  statusSchema,
  viewSchema,
} from "./validation";
sharp.concurrency(1);
const origin = process.env.SITE_URL || "http://localhost:8086";
function isAllowedOrigin(clientOrigin?: string): boolean {
  if (!clientOrigin) return false;
  if (clientOrigin === origin) return true;
  if (process.env.NODE_ENV !== "production") {
    try {
      const u = new URL(clientOrigin);
      if (
        u.hostname === "localhost" ||
        u.hostname === "127.0.0.1" ||
        u.hostname.endsWith(".localhost")
      ) {
        return true;
      }
    } catch {
      return false;
    }
  }
  return false;
}
const uploads = process.env.UPLOAD_DIR || "./uploads";
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
async function auth(req: any, res: any) {
  const token = req.cookies.session;
  if (
    !token ||
    !(
      await db.query(
        "SELECT 1 FROM sessions WHERE token_hash=$1 AND expires_at>now()",
        [digest(token)],
      )
    ).rowCount
  ) {
    res.code(401).send({ error: "Inicia sesión / Please sign in" });
    return false;
  }
  return true;
}
@Controller("/api")
class ApiController {
  @Get("health") async health() {
    await db.query("SELECT 1");
    return { ok: true };
  }
  @Get("site/:locale") async site(@Param("locale") lang: string) {
    locale.parse(lang);
    return (
      await db.query("SELECT content FROM settings WHERE locale=$1", [lang])
    ).rows[0]?.content;
  }
  @Get("posts/:locale") async posts(@Param("locale") lang: string) {
    locale.parse(lang);
    return (
      await db.query(
        "SELECT id,translation_key,locale,slug,title,excerpt,image,image_alt,created_at,updated_at FROM posts WHERE locale=$1 AND published=true ORDER BY created_at DESC,id DESC",
        [lang],
      )
    ).rows;
  }
  @Get("post/:locale/:slug") async one(
    @Param("locale") lang: string,
    @Param("slug") slug: string,
    @Res({ passthrough: true }) res: any,
  ) {
    locale.parse(lang);
    const post = (
      await db.query(
        "SELECT * FROM posts WHERE locale=$1 AND slug=$2 AND published=true",
        [lang, slug],
      )
    ).rows[0];
    if (!post) {
      res.code(404);
      return { error: "Not found" };
    }
    post.translations = (
      await db.query(
        "SELECT locale,slug FROM posts WHERE translation_key=$1 AND published=true",
        [post.translation_key],
      )
    ).rows;
    return post;
  }
  @Post("contact") async contact(@Req() req: any) {
    const data = contactSchema.parse(req.body);
    if (data.website) return { ok: true };
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<{ id: number }>(
        "INSERT INTO contacts(name,email,company,service,message,locale) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",
        [
          data.name,
          data.email,
          data.company,
          data.service,
          data.message,
          data.locale,
        ],
      );
      await client.query(
        "INSERT INTO contact_notifications(contact_id) VALUES($1)",
        [result.rows[0].id],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return { ok: true };
  }
  @Post("view") async view(@Req() req: any) {
    const d = viewSchema.parse(req.body);
    let host = "direct";
    try {
      host = new URL(d.referrer).hostname;
      if (
        host === new URL(origin).hostname ||
        host === req.headers.host?.split(":")[0] ||
        host === "localhost" ||
        host.endsWith(".localhost")
      )
        host = "internal";
    } catch {}
    await db.query(
      "INSERT INTO page_views(path,referrer) VALUES($1,$2) ON CONFLICT(day,path,referrer) DO UPDATE SET count=page_views.count+1",
      [d.path, host],
    );
    return { ok: true };
  }
  @Post("login") async login(
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const d = loginSchema.parse(req.body);
    const admin = (
      await db.query("SELECT * FROM admins WHERE email=$1", [d.email])
    ).rows[0];
    const valid = await argon2.verify(
      admin?.password_hash || dummyHash,
      d.password,
    );
    if (!admin || !valid) {
      res.code(401);
      return { error: "Credenciales incorrectas / Invalid credentials" };
    }
    const token = randomBytes(32).toString("hex");
    await db.query(
      "INSERT INTO sessions VALUES($1,$2,now()+interval '8 hours')",
      [digest(token), admin.id],
    );
    res.setCookie("session", token, {
      path: "/api",
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 28800,
    });
    return { ok: true };
  }
  @Post("password-reset/request") async requestPasswordReset(@Req() req: any) {
    const { email } = passwordResetRequestSchema.parse(req.body);
    const admin = (
      await db.query("SELECT id,email FROM admins WHERE email=$1", [email])
    ).rows[0];
    if (admin) {
      const token = randomBytes(32).toString("hex");
      await db.query("DELETE FROM admin_password_resets WHERE admin_id=$1", [
        admin.id,
      ]);
      await db.query(
        "INSERT INTO admin_password_resets(token_hash,admin_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",
        [digest(token), admin.id],
      );
      const resetUrl = `${origin}/admin#reset=${encodeURIComponent(token)}`;
      void sendAdminPasswordReset(admin.email, resetUrl).catch(() =>
        console.error("Admin password reset email delivery failed"),
      );
    }
    return {
      ok: true,
      message:
        "Si el correo corresponde a una cuenta, recibirás instrucciones.",
    };
  }
  @Post("password-reset/complete") async completePasswordReset(
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const data = passwordResetSchema.parse(req.body);
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const reset = (
        await client.query(
          "SELECT admin_id FROM admin_password_resets WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE",
          [digest(data.token)],
        )
      ).rows[0];
      if (!reset) {
        await client.query("ROLLBACK");
        res.code(400);
        return { error: "El enlace venció o ya fue utilizado." };
      }
      await client.query("UPDATE admins SET password_hash=$1 WHERE id=$2", [
        await argon2.hash(data.password),
        reset.admin_id,
      ]);
      await client.query("DELETE FROM sessions WHERE admin_id=$1", [
        reset.admin_id,
      ]);
      await client.query(
        "UPDATE admin_password_resets SET used_at=now() WHERE token_hash=$1",
        [digest(data.token)],
      );
      await client.query("COMMIT");
      res.clearCookie("session", { path: "/api" });
      return { ok: true };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  @Post("logout") async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    if (req.cookies.session)
      await db.query("DELETE FROM sessions WHERE token_hash=$1", [
        digest(req.cookies.session),
      ]);
    res.clearCookie("session", { path: "/api" });
    return { ok: true };
  }
  @Post("admin/change-password") async changePassword(
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    if (!(await auth(req, res))) return;
    const data = changePasswordSchema.parse(req.body);
    const token = req.cookies.session;
    const session = (
      await db.query(
        "SELECT a.id,a.password_hash FROM sessions s JOIN admins a ON a.id=s.admin_id WHERE s.token_hash=$1 AND s.expires_at>now()",
        [digest(token)],
      )
    ).rows[0];
    if (
      !session ||
      !(await argon2.verify(session.password_hash, data.currentPassword))
    ) {
      res.code(401);
      return { error: "Contraseña actual incorrecta" };
    }
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query("UPDATE admins SET password_hash=$1 WHERE id=$2", [
        await argon2.hash(data.newPassword),
        session.id,
      ]);
      await client.query("DELETE FROM sessions WHERE admin_id=$1", [
        session.id,
      ]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    res.clearCookie("session", { path: "/api" });
    return { ok: true };
  }
  @Get("admin/data") async admin(
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    if (!(await auth(req, res))) return;
    const [contacts, posts, settings, views, sources, pages] =
      await Promise.all([
        db.query("SELECT * FROM contacts ORDER BY created_at DESC LIMIT 500"),
        db.query("SELECT * FROM posts ORDER BY updated_at DESC"),
        db.query("SELECT * FROM settings"),
        db.query(
          "SELECT day,sum(count)::int AS views FROM page_views WHERE day>CURRENT_DATE-30 GROUP BY day ORDER BY day",
        ),
        db.query(
          "SELECT referrer,sum(count)::int AS views FROM page_views WHERE day>CURRENT_DATE-30 GROUP BY referrer ORDER BY views DESC LIMIT 20",
        ),
        db.query(
          "SELECT path,sum(count)::int AS views FROM page_views WHERE day>CURRENT_DATE-30 GROUP BY path ORDER BY views DESC LIMIT 20",
        ),
      ]);
    return {
      contacts: contacts.rows,
      posts: posts.rows,
      settings: settings.rows,
      views: views.rows,
      sources: sources.rows,
      pages: pages.rows,
    };
  }
  @Put("admin/contact/:id") async status(
    @Req() req: any,
    @Param("id") id: string,
    @Res({ passthrough: true }) res: any,
  ) {
    if (!(await auth(req, res))) return;
    const d = statusSchema.parse(req.body);
    await db.query("UPDATE contacts SET status=$1 WHERE id=$2", [
      d.status,
      idSchema.parse(id),
    ]);
    return { ok: true };
  }
  @Delete("admin/contact/:id") async remove(
    @Req() req: any,
    @Param("id") id: string,
    @Res({ passthrough: true }) res: any,
  ) {
    if (!(await auth(req, res))) return;
    await db.query("DELETE FROM contacts WHERE id=$1", [idSchema.parse(id)]);
    return { ok: true };
  }
  @Post("admin/posts") async save(
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    if (!(await auth(req, res))) return;
    const d = postSchema.parse(req.body);
    const result = await db.query(
      "INSERT INTO posts(translation_key,locale,slug,title,excerpt,body,image,image_alt,published) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id",
      Object.values(d),
    );
    return result.rows[0];
  }
  @Put("admin/posts/:id") async update(
    @Req() req: any,
    @Param("id") id: string,
    @Res({ passthrough: true }) res: any,
  ) {
    if (!(await auth(req, res))) return;
    const d = postSchema.parse(req.body);
    await db.query(
      "UPDATE posts SET translation_key=$1,locale=$2,slug=$3,title=$4,excerpt=$5,body=$6,image=$7,image_alt=$8,published=$9,updated_at=now() WHERE id=$10",
      [...Object.values(d), idSchema.parse(id)],
    );
    return { ok: true };
  }
  @Put("admin/site/:locale") async updateSite(
    @Req() req: any,
    @Param("locale") lang: string,
    @Res({ passthrough: true }) res: any,
  ) {
    if (!(await auth(req, res))) return;
    locale.parse(lang);
    const d = settingsSchema.parse(req.body);
    await db.query("UPDATE settings SET content=$1 WHERE locale=$2", [
      JSON.stringify(d),
      lang,
    ]);
    return { ok: true };
  }
  @Post("admin/upload") async upload(
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    if (!(await auth(req, res))) return;
    const file = await req.file();
    if (
      !file ||
      !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(
        file.mimetype,
      )
    ) {
      res.code(400);
      return { error: "Usa JPG, PNG, WebP o AVIF, máximo 5 MB." };
    }
    const input = await file.toBuffer();
    let result: Buffer;
    try {
      result = await sharp(input, { limitInputPixels: 20000000 })
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 78 })
        .toBuffer();
    } catch {
      res.code(400);
      return { error: "Imagen inválida o demasiado grande." };
    }
    const name = randomBytes(16).toString("hex") + ".webp";
    await writeFile(join(uploads, name), result, { flag: "wx" });
    return { url: "/api/media/" + name, size: result.length };
  }
  @Get("media/:name") async media(
    @Param("name") name: string,
    @Res() res: any,
  ) {
    if (!/^[a-f0-9]{32}\.webp$/.test(name)) return res.code(404).send();
    try {
      const body = await readFile(join(uploads, name));
      res
        .header("Content-Type", "image/webp")
        .header("Cache-Control", "public,max-age=31536000,immutable")
        .send(body);
    } catch {
      res.code(404).send();
    }
  }
}
@Module({ controllers: [ApiController] })
class AppModule {}
let dummyHash = "";
async function bootstrap() {
  if (
    process.env.NODE_ENV === "production" &&
    (!process.env.SITE_URL?.startsWith("https://") || !process.env.DATABASE_URL)
  )
    throw new Error("Production requires HTTPS SITE_URL and DATABASE_URL");
  await mkdir(uploads, { recursive: true });
  dummyHash = await argon2.hash(randomBytes(32));
  await db.query(await readFile(join(__dirname, "../src/schema.sql"), "utf8"));
  await runMigrations(db);
  const seed = JSON.parse(
    await readFile(join(__dirname, "../src/seed.json"), "utf8"),
  );
  for (const [lang, content] of Object.entries(seed.settings))
    await db.query(
      "INSERT INTO settings VALUES($1,$2) ON CONFLICT DO NOTHING",
      [lang, JSON.stringify(content)],
    );
  for (const p of seed.posts)
    await db.query(
      "INSERT INTO posts(translation_key,locale,slug,title,excerpt,body,image,image_alt,published) VALUES($1,$2,$3,$4,$5,$6,$7,$8,true) ON CONFLICT DO NOTHING",
      [
        p.key,
        p.locale,
        p.slug,
        p.title,
        p.excerpt,
        p.body,
        p.image,
        p.image_alt,
      ],
    );
  // Upgrade only bundled placeholder images; keep editorial uploads and choices.
  await db.query(
    "UPDATE settings SET content = jsonb_set(content, '{image}', to_jsonb($1::text)) WHERE content->>'image' = '/images/mvp-studio.webp'",
    ["/images/business-collaboration.webp"],
  );
  for (const p of seed.posts)
    await db.query(
      "UPDATE posts SET image=$1, image_alt=$2 WHERE translation_key=$3 AND locale=$4 AND image='/images/mvp-studio.webp'",
      [p.image, p.image_alt, p.key, p.locale],
    );
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    if (process.env.ADMIN_PASSWORD.length < 16)
      throw new Error("ADMIN_PASSWORD must have at least 16 characters");
    await db.query(
      "INSERT INTO admins(email,password_hash) VALUES($1,$2) ON CONFLICT DO NOTHING",
      [
        process.env.ADMIN_EMAIL.toLowerCase(),
        await argon2.hash(process.env.ADMIN_PASSWORD),
      ],
    );
  }
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ bodyLimit: 100000, trustProxy: false, logger: false }),
  );
  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook("onRoute", (options: any) => {
    if (options.method === "GET" && !options.url.startsWith("/api/admin/")) {
      options.config = { ...options.config, rateLimit: false };
    }
    if (options.url === "/api/login")
      options.config = {
        ...options.config,
        rateLimit: { max: 5, timeWindow: "15 minutes" },
      };
    if (options.url === "/api/password-reset/request")
      options.config = {
        ...options.config,
        rateLimit: { max: 3, timeWindow: "15 minutes" },
      };
    if (options.url === "/api/admin/change-password")
      options.config = {
        ...options.config,
        rateLimit: { max: 5, timeWindow: "15 minutes" },
      };
    if (options.url === "/api/contact")
      options.config = {
        ...options.config,
        rateLimit: { max: 5, timeWindow: "1 hour" },
      };
  });
  await app.register(cookie);
  await app.register(helmet, { contentSecurityPolicy: false, hsts: false });
  await app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute",
    keyGenerator: (req: any) => req.headers["x-real-ip"] || req.ip,
  });
  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 },
  });
  fastify.addHook("onRequest", async (req: any, res: any) => {
    res.header("Cache-Control", "no-store");
    if (
      ["POST", "PUT", "DELETE", "PATCH"].includes(req.method) &&
      !isAllowedOrigin(req.headers.origin)
    )
      return res.code(403).send({ error: "Origin not allowed" });
  });
  app.useGlobalFilters({
    catch(error: any, host: any) {
      const res = host.switchToHttp().getResponse();
      if (error instanceof ZodError)
        return res.code(400).send({
          error: "Revisa los campos / Check the fields",
          fields: error.issues.map((i) => i.path.join(".")),
        });
      if (error.code === "23505")
        return res.code(409).send({
          error:
            "Ese slug o traducción ya existe / Slug or translation already exists",
        });
      if (error.code === "23514" || error.code === "22021")
        return res.code(400).send({
          error: "Revisa los campos / Check the fields",
          fields: [],
        });
      const status = error.statusCode || error.status || 500;
      if (status >= 500) console.error("API error", error.code || error.name);
      res.code(status).send({
        error:
          status >= 500
            ? "Error interno / Internal error"
            : "Solicitud no válida / Invalid request",
      });
    },
  });
  const cleanup = () =>
    db
      .query(
        "DELETE FROM sessions WHERE expires_at<now(); DELETE FROM page_views WHERE day<CURRENT_DATE-90; DELETE FROM contacts WHERE created_at<now()-interval '12 months'",
      )
      .catch(() => console.error("Retention cleanup failed"));
  await cleanup();
  setInterval(cleanup, 86400000).unref();
  const stopContactWorker = startContactNotificationWorker(db);
  app.getHttpAdapter().getInstance().addHook("onClose", stopContactWorker);
  app.enableShutdownHooks();
  await app.listen(3000, "0.0.0.0");
}
bootstrap().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
