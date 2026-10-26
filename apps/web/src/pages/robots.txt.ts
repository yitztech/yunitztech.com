import { siteUrl } from "../lib/api";

// Sin Disallow: lo privado se excluye con noindex (meta en la página, X-Robots-Tag en la API). Una URL
// bloqueada que tiene enlaces se indexa sin que Google pueda leer su noindex.
export const GET = () =>
  new Response(`User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`, {
    headers: { "Content-Type": "text/plain" },
  });
