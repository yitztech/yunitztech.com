import { z } from "zod";

// Límites compartidos con el frontend (atributos maxlength) y con las
// restricciones CHECK de schema.sql. Cambia los tres a la vez.
export const LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 254 },
  company: { max: 150 },
  service: { min: 2, max: 100 },
  message: { min: 20, max: 5000 },
  postTitle: { min: 5, max: 180 },
  postExcerpt: { min: 20, max: 320 },
  postBody: { min: 80, max: 60000 },
  postSlug: { min: 1, max: 150 },
  translationKey: { min: 1, max: 100 },
  imageAlt: { max: 200 },
  headline: { min: 10, max: 180 },
  description: { min: 20, max: 400 },
  serviceTitle: { min: 2, max: 90 },
  serviceDescription: { min: 10, max: 250 },
  services: { min: 1, max: 12 },
  password: { max: 200 },
} as const;

export const LOCALES = ["es", "en", "fr", "de", "pt"] as const;
export const CONTACT_STATUSES = ["new", "in-progress", "closed"] as const;

// Sin caracteres de control (ni NUL, que Postgres rechaza y causaría un 500).
const noControl = /^[^\p{Cc}]*$/u;
// Texto multilínea: permite \t \n \r pero ningún otro control.
const noControlMultiline =
  /^[^\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]*$/;
// Nombres de persona: letras Unicode, marcas, espacios, apóstrofo, punto y guion.
const personName = /^\p{L}[\p{L}\p{M} '’.\-]*$/u;
// Empresa: letras, números y puntuación habitual de razones sociales.
const companyName = /^[\p{L}\p{N}][\p{L}\p{N}\p{M} &.,'’()/+\-]*$/u;

export const locale = z.enum(LOCALES);
export const imagePath = z
  .string()
  .regex(
    /^\/(images\/[a-zA-Z0-9_-]+\.(webp|avif)|api\/media\/[a-f0-9]{32}\.webp)$/,
  );

export const postSchema = z
  .object({
    translation_key: z
      .string()
      .min(LIMITS.translationKey.min)
      .max(LIMITS.translationKey.max)
      .regex(/^[a-z0-9-]+$/),
    locale,
    slug: z
      .string()
      .min(LIMITS.postSlug.min)
      .max(LIMITS.postSlug.max)
      .regex(/^[a-z0-9-]+$/),
    title: z
      .string()
      .trim()
      .min(LIMITS.postTitle.min)
      .max(LIMITS.postTitle.max)
      .regex(noControl),
    excerpt: z
      .string()
      .trim()
      .min(LIMITS.postExcerpt.min)
      .max(LIMITS.postExcerpt.max)
      .regex(noControl),
    body: z
      .string()
      .min(LIMITS.postBody.min)
      .max(LIMITS.postBody.max)
      .regex(noControlMultiline),
    image: imagePath,
    image_alt: z.string().max(LIMITS.imageAlt.max).regex(noControl),
    published: z.boolean(),
  })
  .strict();

export const settingsSchema = z
  .object({
    headline: z
      .string()
      .min(LIMITS.headline.min)
      .max(LIMITS.headline.max)
      .regex(noControl),
    description: z
      .string()
      .min(LIMITS.description.min)
      .max(LIMITS.description.max)
      .regex(noControl),
    image: imagePath,
    services: z
      .array(
        z.object({
          title: z
            .string()
            .min(LIMITS.serviceTitle.min)
            .max(LIMITS.serviceTitle.max)
            .regex(noControl),
          description: z
            .string()
            .min(LIMITS.serviceDescription.min)
            .max(LIMITS.serviceDescription.max)
            .regex(noControl),
        }),
      )
      .min(LIMITS.services.min)
      .max(LIMITS.services.max),
  })
  .strict();

export const contactSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(LIMITS.name.min)
      .max(LIMITS.name.max)
      .regex(personName),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email().max(LIMITS.email.max)),
    company: z
      .string()
      .trim()
      .max(LIMITS.company.max)
      .refine((v) => v === "" || companyName.test(v)),
    service: z
      .string()
      .trim()
      .min(LIMITS.service.min)
      .max(LIMITS.service.max)
      .regex(/^[^<>\p{Cc}]+$/u),
    message: z
      .string()
      .trim()
      .min(LIMITS.message.min)
      .max(LIMITS.message.max)
      .regex(noControlMultiline),
    locale,
    consent: z.literal(true),
    website: z.string().max(200).optional(),
  })
  .strict();

export const viewSchema = z.object({
  path: z
    .string()
    .max(200)
    .regex(/^\/(?:(?:en|fr|de|pt)\/)?(?:blog(?:\/[a-z0-9-]+)?\/?)?$/),
  referrer: z.string().max(2048),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(LIMITS.email.max)),
  password: z.string().min(1).max(LIMITS.password.max),
});
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(LIMITS.password.max),
  newPassword: z.string().min(16).max(LIMITS.password.max),
});
export const passwordResetRequestSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(LIMITS.email.max)),
});
export const passwordResetSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  password: z.string().min(16).max(LIMITS.password.max),
});

export const statusSchema = z.object({ status: z.enum(CONTACT_STATUSES) });
export const idSchema = z.coerce.number().int().positive().max(2147483647);
