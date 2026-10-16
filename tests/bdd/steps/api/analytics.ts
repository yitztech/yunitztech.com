import { Then, expect } from "../../fixtures";

Then(
  "el panel del administrador expone las métricas de visitas",
  async ({ admin }) => {
    const data = await (await admin.get("/api/admin/data")).json();
    for (const key of ["views", "sources", "pages"])
      expect(Array.isArray(data[key])).toBe(true);
  },
);
