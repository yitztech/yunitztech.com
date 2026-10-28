import nodemailer from "nodemailer";
import type { Pool, PoolClient } from "pg";
import { log, reportError } from "./observability";

export function mailConfig() {
  const host = process.env.SMTP_HOST;
  const to = process.env.CONTACT_NOTIFICATION_TO;
  const from = process.env.SMTP_FROM;
  if (!host || !to || !from) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("SMTP_PORT must be a valid TCP port");
  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    to,
    from,
  };
}

export async function sendAdminPasswordReset(to: string, url: string) {
  const config = mailConfig();
  if (!config) return false;
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    connectionTimeout: 10_000,
    socketTimeout: 15_000,
  });
  await transport.sendMail({
    from: config.from,
    to,
    subject: "Recuperación de acceso al panel",
    text: `Solicitaste restablecer la contraseña del panel. El enlace vence en una hora y solo puede usarse una vez:\n\n${url}\n\nSi no solicitaste este cambio, ignora este correo.`,
  });
  return true;
}

export async function queueContactNotification(
  pool: Pool,
  contactId: number,
): Promise<void> {
  await pool.query(
    "INSERT INTO contact_notifications(contact_id) VALUES($1) ON CONFLICT(contact_id) DO NOTHING",
    [contactId],
  );
}

export function startContactNotificationWorker(pool: Pool) {
  let stopped = false;
  let running = false;
  const config = mailConfig();
  const timer = setInterval(async () => {
    if (stopped || running || !config) return;
    running = true;
    let client: PoolClient | undefined;
    try {
      client = await pool.connect();
      await client.query("BEGIN");
      const result = await client.query(
        `SELECT n.id, n.contact_id, n.attempts, c.name, c.email, c.company,
                c.service, c.message, c.locale, c.created_at
         FROM contact_notifications n JOIN contacts c ON c.id=n.contact_id
         WHERE n.sent_at IS NULL AND n.next_attempt_at <= now()
         ORDER BY n.id FOR UPDATE OF n SKIP LOCKED LIMIT 1`,
      );
      if (result.rowCount)
        await client.query(
          "UPDATE contact_notifications SET next_attempt_at=now()+interval '15 minutes' WHERE id=$1",
          [result.rows[0].id],
        );
      await client.query("COMMIT");
      if (!result.rowCount) return;
      const item = result.rows[0];
      try {
        const transport = nodemailer.createTransport({
          host: config.host,
          port: config.port,
          secure: config.secure,
          auth: config.auth,
          connectionTimeout: 10_000,
          socketTimeout: 15_000,
        });
        await transport.sendMail({
          from: config.from,
          to: config.to,
          replyTo: item.email,
          subject: `Nuevo contacto: ${item.service}`,
          text: [
            `Nombre: ${item.name}`,
            `Correo: ${item.email}`,
            `Empresa: ${item.company || "—"}`,
            `Servicio: ${item.service}`,
            `Idioma: ${item.locale}`,
            `Fecha: ${new Date(item.created_at).toISOString()}`,
            "",
            "Mensaje:",
            item.message,
          ].join("\n"),
        });
        await pool.query(
          "UPDATE contact_notifications SET sent_at=now(),last_error=NULL WHERE id=$1",
          [item.id],
        );
      } catch (error) {
        const attempts = item.attempts + 1;
        const backoffSeconds = Math.min(
          3600,
          30 * 2 ** Math.min(attempts - 1, 7),
        );
        await pool.query(
          `UPDATE contact_notifications SET attempts=$2,
             next_attempt_at=now()+($3 * interval '1 second'), last_error=$4
           WHERE id=$1`,
          [
            item.id,
            attempts,
            backoffSeconds,
            error instanceof Error ? error.message.slice(0, 500) : "SMTP error",
          ],
        );
        log("error", "Contact notification delivery failed", { attempts });
      }
    } catch (error) {
      await client?.query("ROLLBACK").catch(() => undefined);
      log("error", "Contact notification worker failed");
      reportError(error);
    } finally {
      client?.release();
      running = false;
    }
  }, 5000);
  timer.unref();
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}
