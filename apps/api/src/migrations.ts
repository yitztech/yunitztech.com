import type { Pool } from "pg";

const migrations = [
  {
    version: 1,
    name: "expand_editorial_locales",
    sql: `
      ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_locale_check;
      ALTER TABLE posts ADD CONSTRAINT posts_locale_check
        CHECK (locale IN ('es','en','fr','de','pt'));
      ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_locale_check;
      ALTER TABLE settings ADD CONSTRAINT settings_locale_check
        CHECK (locale IN ('es','en','fr','de','pt'));
    `,
  },
] as const;

export async function runMigrations(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      "SELECT pg_advisory_lock(hashtext('yunitz:migrations'))",
    );
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version integer PRIMARY KEY,
        name text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const applied = await client.query<{ version: number }>(
      "SELECT version FROM schema_migrations",
    );
    const knownVersions = new Set<number>(
      migrations.map(({ version }) => version),
    );
    for (const row of applied.rows) {
      if (!knownVersions.has(row.version))
        throw new Error(
          `Database has unknown migration version ${row.version}`,
        );
    }
    for (const migration of migrations) {
      if (applied.rows.some(({ version }) => version === migration.version))
        continue;
      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query(
          "INSERT INTO schema_migrations(version,name) VALUES($1,$2)",
          [migration.version, migration.name],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    try {
      await client.query(
        "SELECT pg_advisory_unlock(hashtext('yunitz:migrations'))",
      );
    } finally {
      client.release();
    }
  }
}
