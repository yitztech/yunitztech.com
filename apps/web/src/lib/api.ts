export const siteUrl = (
  process.env.SITE_URL || "http://localhost:8086"
).replace(/\/$/, "");
export async function api(path: string) {
  const response = await fetch(
    `${process.env.API_URL || "http://localhost:3000"}/api/${path}`,
    { signal: AbortSignal.timeout(5000) },
  );
  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.json();
}
export const route = (lang: string, path = "") => {
  const prefix = lang === "es" ? "" : `/${lang}`;
  if (!path) return prefix || "/";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${prefix}${cleanPath}`;
};
