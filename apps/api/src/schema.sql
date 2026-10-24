CREATE TABLE IF NOT EXISTS admins (id serial PRIMARY KEY, email text UNIQUE NOT NULL, password_hash text NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, admin_id integer NOT NULL REFERENCES admins(id), expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS admin_password_resets (
  token_hash text PRIMARY KEY,
  admin_id integer NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS contacts (id serial PRIMARY KEY, name text NOT NULL, email text NOT NULL, company text NOT NULL, service text NOT NULL, message text NOT NULL, locale text NOT NULL, consent_version text NOT NULL DEFAULT '2026-09', status text NOT NULL DEFAULT 'new', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS posts (id serial PRIMARY KEY, translation_key text NOT NULL, locale text NOT NULL CHECK(locale IN ('es','en','fr','de','pt')), slug text NOT NULL, title text NOT NULL, excerpt text NOT NULL, body text NOT NULL, image text NOT NULL DEFAULT '/images/mvp-studio.webp', image_alt text NOT NULL DEFAULT '', published boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(locale,slug), UNIQUE(translation_key,locale));
CREATE TABLE IF NOT EXISTS settings (locale text PRIMARY KEY CHECK(locale IN ('es','en','fr','de','pt')), content jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS page_views (day date NOT NULL DEFAULT CURRENT_DATE, path text NOT NULL, referrer text NOT NULL, count integer NOT NULL DEFAULT 1, PRIMARY KEY(day,path,referrer));
CREATE TABLE IF NOT EXISTS contact_notifications (
  id bigserial PRIMARY KEY,
  contact_id integer NOT NULL UNIQUE REFERENCES contacts(id) ON DELETE CASCADE,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contact_notifications_pending_idx
  ON contact_notifications(next_attempt_at, id) WHERE sent_at IS NULL;

-- Restricciones CHECK que replican las reglas de validation.ts. Se añaden como
-- NOT VALID para no bloquear despliegues con filas antiguas: se aplican a toda
-- inserción o actualización nueva. Idempotente.
DO $schema$
DECLARE c record;
BEGIN
  FOR c IN SELECT * FROM (VALUES
    ('admins', 'admins_email_valid', $chk$char_length(email) <= 254 AND email = lower(btrim(email)) AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'$chk$),
    ('admins', 'admins_password_hash_valid', $chk$char_length(password_hash) BETWEEN 20 AND 500$chk$),
    ('contacts', 'contacts_name_valid', $chk$char_length(name) BETWEEN 2 AND 100 AND name = btrim(name) AND name !~ '[0-9<>@#$%^&*=+|/{}()~`_;:!?",\\\[\]]' AND name !~ '[[:cntrl:]]'$chk$),
    ('contacts', 'contacts_email_valid', $chk$char_length(email) <= 254 AND email = lower(btrim(email)) AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'$chk$),
    ('contacts', 'contacts_company_valid', $chk$char_length(company) <= 150 AND company = btrim(company) AND company !~ '[<>@#$%^*=|{}~`_;:!?"\\\[\]]' AND company !~ '[[:cntrl:]]'$chk$),
    ('contacts', 'contacts_service_valid', $chk$char_length(service) BETWEEN 2 AND 100 AND service !~ '[<>]' AND service !~ '[[:cntrl:]]'$chk$),
    ('contacts', 'contacts_message_valid', $chk$char_length(message) BETWEEN 20 AND 5000 AND message !~ '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]'$chk$),
    ('contacts', 'contacts_locale_valid', $chk$locale IN ('es','en','fr','de','pt')$chk$),
    ('contacts', 'contacts_status_valid', $chk$status IN ('new','in-progress','closed')$chk$),
    ('contacts', 'contacts_consent_valid', $chk$char_length(consent_version) BETWEEN 1 AND 20$chk$),
    ('posts', 'posts_translation_key_valid', $chk$char_length(translation_key) BETWEEN 1 AND 100 AND translation_key ~ '^[a-z0-9-]+$'$chk$),
    ('posts', 'posts_slug_valid', $chk$char_length(slug) BETWEEN 1 AND 150 AND slug ~ '^[a-z0-9-]+$'$chk$),
    ('posts', 'posts_title_valid', $chk$char_length(title) BETWEEN 5 AND 180 AND title !~ '[[:cntrl:]]'$chk$),
    ('posts', 'posts_excerpt_valid', $chk$char_length(excerpt) BETWEEN 20 AND 320 AND excerpt !~ '[[:cntrl:]]'$chk$),
    ('posts', 'posts_body_valid', $chk$char_length(body) BETWEEN 80 AND 60000 AND body !~ '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]'$chk$),
    ('posts', 'posts_image_valid', $chk$image ~ '^/(images/[a-zA-Z0-9_-]+\.(webp|avif)|api/media/[a-f0-9]{32}\.webp)$'$chk$),
    ('posts', 'posts_image_alt_valid', $chk$char_length(image_alt) <= 200 AND image_alt !~ '[[:cntrl:]]'$chk$),
    ('settings', 'settings_content_valid', $chk$jsonb_typeof(content) = 'object'
      AND char_length(content->>'headline') BETWEEN 10 AND 180
      AND char_length(content->>'description') BETWEEN 20 AND 400
      AND (content->>'image') ~ '^/(images/[a-zA-Z0-9_-]+\.(webp|avif)|api/media/[a-f0-9]{32}\.webp)$'
      AND jsonb_typeof(content->'services') = 'array'
      AND jsonb_array_length(content->'services') BETWEEN 1 AND 12$chk$),
    ('page_views', 'page_views_path_valid', $chk$char_length(path) <= 200 AND path ~ '^/((en|fr|de|pt)/)?(blog(/[a-z0-9-]+)?/?)?$'$chk$),
    ('page_views', 'page_views_referrer_valid', $chk$char_length(referrer) BETWEEN 1 AND 2048$chk$),
    ('page_views', 'page_views_count_valid', $chk$count >= 1$chk$)
  ) AS v(tbl, name, expr) LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = c.name) THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I CHECK (%s) NOT VALID', c.tbl, c.name, c.expr);
    END IF;
  END LOOP;
END
$schema$;
