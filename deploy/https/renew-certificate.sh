#!/bin/sh
set -eu

# Certbot 5.10.0. Keep the IP certificate separate from the host's older Certbot.
CERTBOT_IMAGE=certbot/certbot@sha256:c5698da859429ccee0fcc299a8000368198222d1f9e789ab6e388b491e8ce06d

exec 9>/run/zaytseva-certbot.lock
flock -n 9 || exit 0

docker run --rm --memory=256m \
    -v /etc/letsencrypt-zaytseva:/etc/letsencrypt \
    -v /var/lib/letsencrypt-zaytseva:/var/lib/letsencrypt \
    -v /var/log/letsencrypt-zaytseva:/var/log/letsencrypt \
    -v /var/www/letsencrypt-zaytseva:/var/www/certbot \
    "$CERTBOT_IMAGE" renew \
    --cert-name zaytseva-interior-ip \
    --non-interactive --no-random-sleep-on-renew "$@"

# Certbot runs in Docker; reload the host Nginx after a successful renewal check.
# A graceful reload is also safe when the certificate was not yet due.
nginx -t
systemctl reload nginx
