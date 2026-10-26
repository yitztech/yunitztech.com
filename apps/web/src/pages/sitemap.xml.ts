import { api, siteUrl } from "../lib/api";

const esc = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );

export async function GET() {
  try {
    const [es, en, fr, de, pt] = await Promise.all([
      api("posts/es"),
      api("posts/en"),
      api("posts/fr"),
      api("posts/de"),
      api("posts/pt"),
    ]);

    // Cada <loc> en la forma de su canonical (Layout.astro): portadas de idioma con barra, resto sin ella
    const paths = [
      "/",
      "/en/",
      "/fr/",
      "/de/",
      "/pt/",
      "/blog",
      "/en/blog",
      "/fr/blog",
      "/de/blog",
      "/pt/blog",
      "/politica-de-privacidad",
      "/condiciones-de-servicio",
      "/en/privacy-policy",
      "/en/terms-of-service",
      "/fr/politique-de-confidentialite",
      "/fr/conditions-de-service",
      "/de/datenschutzerklaerung",
      "/de/nutzungsbedingungen",
      "/pt/politica-de-privacidade",
      "/pt/termos-de-servico",
    ].map((path) => ({ path, date: null }));

    for (const p of [...es, ...en, ...fr, ...de, ...pt]) {
      paths.push({
        path: `${p.locale === "es" ? "" : "/" + p.locale}/blog/${p.slug}`,
        date: p.updated_at,
      });
    }

    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
        paths
          .map(
            (p) =>
              `<url><loc>${esc(siteUrl + p.path)}</loc>${p.date ? `<lastmod>${new Date(p.date).toISOString()}</lastmod>` : ""}</url>`,
          )
          .join("") +
        "</urlset>",
      { headers: { "Content-Type": "application/xml" } },
    );
  } catch {
    return new Response("Temporarily unavailable", { status: 503 });
  }
}
