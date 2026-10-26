#!/bin/sh
# Admin panel on its own host when ADMIN_HOST is set (e.g. admin.yunitztech.com).
# Without it nothing is generated and the panel stays at /admin on the site host.
set -eu
[ -n "${ADMIN_HOST:-}" ] || exit 0
case "$ADMIN_HOST" in
  *[!a-z0-9.-]* | .* | *.) echo "ADMIN_HOST must be a lowercase host name" >&2; exit 1 ;;
esac
case "${SITE_URL:-}" in
  https://*) ;;
  *) echo "ADMIN_HOST requires an HTTPS SITE_URL" >&2; exit 1 ;;
esac
site_url="${SITE_URL%/}"

# Site host: the old panel URL moves to the admin host, and the login and
# admin API answer only there.
mkdir -p /tmp/nginx/admin-host
cat > /tmp/nginx/admin-host/site.conf <<EOF
location = /admin { return 301 https://$ADMIN_HOST/; }
location = /admin/ { return 301 https://$ADMIN_HOST/; }
location ~ ^/api/(?:login|logout|password-reset/|admin/) {
  include /etc/nginx/security-headers.conf;
  default_type application/json;
  return 404 '{"error":"Not found"}';
}
EOF

cat > /tmp/nginx/admin.conf <<EOF
server {
  listen 8080;
  server_name $ADMIN_HOST;
  set_real_ip_from $TRUSTED_PROXY_CIDR;
  real_ip_header X-Forwarded-For;
  real_ip_recursive on;
  server_tokens off;
  # Relative Location: nginx would otherwise add its own scheme and port (http, 8080)
  absolute_redirect off;
  resolver 127.0.0.11 valid=10s ipv6=off;
  client_max_body_size 6m;
  access_log off;
  error_log /dev/stderr warn;
  include /etc/nginx/security-headers.conf;
  add_header X-Robots-Tag "noindex, nofollow" always;
  gzip on;
  gzip_types text/css application/javascript application/json application/xml image/svg+xml;
  location = / {
    set \$web_upstream web:4321;
    proxy_pass http://\$web_upstream/admin;
    proxy_set_header Host \$http_host;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_read_timeout 30s;
  }
  location = /admin { return 301 /; }
  location ^~ /_astro/ {
    set \$web_upstream web:4321;
    proxy_pass http://\$web_upstream;
    proxy_set_header Host \$http_host;
    proxy_read_timeout 30s;
  }
  location = /favicon.svg {
    set \$web_upstream web:4321;
    proxy_pass http://\$web_upstream;
    proxy_set_header Host \$http_host;
  }
  location = /robots.txt {
    include /etc/nginx/security-headers.conf;
    add_header X-Robots-Tag "noindex, nofollow" always;
    default_type text/plain;
    # No Disallow: every response here carries X-Robots-Tag noindex, and a blocked URL
    # with links gets indexed without Google ever reading it (AGENTS.md §9.2).
    return 200 "User-agent: *\nAllow: /\n";
  }
  # The panel page would count as a visit to the home page.
  location = /api/view { return 204; }
  location /api/ {
    set \$api_upstream api:3000;
    proxy_pass http://\$api_upstream;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$remote_addr;
    proxy_read_timeout 30s;
    proxy_hide_header X-Frame-Options;
    proxy_hide_header X-Content-Type-Options;
    proxy_hide_header Referrer-Policy;
    proxy_hide_header Strict-Transport-Security;
  }
  # Links in the shared layout (home, blog, languages) go back to the public site.
  location / { return 301 $site_url\$request_uri; }
}
EOF
