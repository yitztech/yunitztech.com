import { readFileSync } from "node:fs";

function fromDotenv(): Record<string, string> {
  try {
    return Object.fromEntries(
      readFileSync(".env", "utf8")
        .split("\n")
        .filter((l) => l.includes("=") && !l.startsWith("#"))
        .map((l) => {
          const i = l.indexOf("=");
          return [l.slice(0, i), l.slice(i + 1)];
        }),
    );
  } catch {
    return {};
  }
}
const file = fromDotenv();
export const adminEmail = process.env.ADMIN_EMAIL || file.ADMIN_EMAIL || "";
export const adminPassword =
  process.env.ADMIN_PASSWORD || file.ADMIN_PASSWORD || "";
export const siteOrigin = process.env.TEST_URL || "http://localhost:8080";
