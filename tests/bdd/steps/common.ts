import { Given, expect } from "../fixtures";
import { findContact, validContact } from "../helpers";

Given(
  "que un visitante envió una solicitud de contacto válida",
  async ({ api, world }) => {
    const res = await api.post("/api/contact", {
      data: validContact(world.vars),
    });
    expect(res.status()).toBe(201);
  },
);
