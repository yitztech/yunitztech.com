import { defineConfig, devices } from "@playwright/test";
import { defineBddProject } from "playwright-bdd";

// Proyectos: smoke (flujos existentes), api (Gherkin contra el backend) y
// web (Gherkin contra el navegador). Ejecuta uno con --project=<nombre>.
export default defineConfig({
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: process.env.TEST_URL || "http://localhost:8080",
    headless: !!process.env.CI,
    ignoreHTTPSErrors: process.env.TEST_INSECURE_TLS === "1",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      ...defineBddProject({
        name: "api",
        features: "tests/bdd/features/api/*.feature",
        steps: [
          "tests/bdd/fixtures.ts",
          "tests/bdd/steps/common.ts",
          "tests/bdd/steps/api/*.ts",
        ],
        outputDir: "tests/bdd/.generated/api",
      }),
    },
    {
      ...defineBddProject({
        name: "web",
        features: "tests/bdd/features/web/*.feature",
        steps: [
          "tests/bdd/fixtures.ts",
          "tests/bdd/steps/common.ts",
          "tests/bdd/steps/web/*.ts",
        ],
        outputDir: "tests/bdd/.generated/web",
      }),
      use: { ...devices["Desktop Chrome"] },
    },
    { name: "smoke", testDir: "./tests/e2e" },
  ],
  reporter: [["list"], ["html", { open: "never" }]],
});
