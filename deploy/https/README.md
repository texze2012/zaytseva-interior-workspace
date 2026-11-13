# HTTPS рабочего пространства

Рабочий адрес: <https://91.132.163.44/>. Конфигурация рассчитана на текущий сервер и Nginx на хосте. Приложение продолжает слушать только локальные порты 13000 и 18000; SSL завершается в Nginx.

Используется доверенный сертификат Let's Encrypt для IP-адреса, профиль `shortlived`. Такие сертификаты действуют около шести дней. Certbot 5.10.0 запускается в официальном Docker-образе, закреплённом по digest. Старый системный Certbot и сертификаты других сайтов используют отдельные каталоги.

## Файлы на сервере

| Файл или каталог | Назначение |
| --- | --- |
| `/etc/nginx/sites-available/zaytseva-interior` | Содержимое `nginx.conf` из этого каталога |
| `/etc/letsencrypt-zaytseva` | ACME-аккаунт, сертификат и закрытые ключи; в Git не включаются |
| `/var/lib/letsencrypt-zaytseva` | Рабочие файлы Certbot |
| `/var/log/letsencrypt-zaytseva` | Журнал Certbot |
| `/var/www/letsencrypt-zaytseva` | Webroot для HTTP-01 проверки владения IP |
| `/usr/local/sbin/zaytseva-renew-certificate` | Скрипт `renew-certificate.sh` |
| `/etc/systemd/system/zaytseva-certbot.service` | Сервис проверки и продления |
| `/etc/systemd/system/zaytseva-certbot.timer` | Таймер проверки два раза в сутки |

HTTP перенаправляется на HTTPS с кодом 308. Исключение `/.well-known/acme-challenge/` остаётся доступным по HTTP для продления. TCP-порты 80 и 443 должны оставаться доступны извне.

IP-сайт назначен TLS-сервером по умолчанию, поскольку клиенты по IP могут не передавать SNI. Именованные HTTPS-сайты выбираются по собственному SNI. Перед применением конфигурации на другом сервере проверьте отсутствие второго `default_server` на порту 443.

## Первичный выпуск

Сначала создайте каталоги из таблицы и добавьте в существующий HTTP-блок только `location` для ACME из `nginx.conf`. Проверьте `nginx -t` и перечитайте конфигурацию. Полный HTTPS-блок подключайте после успешного выпуска сертификата.

```sh
docker run --rm --memory=256m \
  -v /etc/letsencrypt-zaytseva:/etc/letsencrypt \
  -v /var/lib/letsencrypt-zaytseva:/var/lib/letsencrypt \
  -v /var/log/letsencrypt-zaytseva:/var/log/letsencrypt \
  -v /var/www/letsencrypt-zaytseva:/var/www/certbot \
  certbot/certbot@sha256:c5698da859429ccee0fcc299a8000368198222d1f9e789ab6e388b491e8ce06d \
  certonly --non-interactive --agree-tos --register-unsafely-without-email \
  --preferred-profile shortlived --webroot --webroot-path /var/www/certbot \
  --ip-address 91.132.163.44 --cert-name zaytseva-interior-ip
```

Для предварительной проверки используйте ту же команду с `--dry-run`. При переносе на другой IP необходимо выпустить соответствующий сертификат и изменить `nginx.conf`.

## Автоматическое продление

Установите скрипт с правами `0750`, а unit-файлы — `0644` по путям из таблицы. Затем:

```sh
systemctl daemon-reload
systemctl enable --now zaytseva-certbot.timer
systemctl start zaytseva-certbot.service
systemctl list-timers zaytseva-certbot.timer
```

Проверка запускается в 00:00 и 12:00 UTC со случайной задержкой до часа. Certbot сам определяет необходимость продления. После успешной проверки скрипт выполняет `nginx -t` и мягкое перечитывание конфигурации на хосте. Docker не получает доступ к сокету Docker или управлению systemd.

Проверка продления и просмотр состояния:

```sh
/usr/local/sbin/zaytseva-renew-certificate --dry-run
systemctl status zaytseva-certbot.timer
journalctl -u zaytseva-certbot.service
curl --fail https://91.132.163.44/api/health/db
```

При переходе с HTTP на HTTPS потребуется один раз войти заново: браузер хранит сессию отдельно для каждого origin. При обычных временных сбоях уже созданная HTTPS-сессия сохраняется.

Документация: [IP-сертификаты Let's Encrypt](https://letsencrypt.org/2026/03/11/shorter-certs-certbot), [продление Certbot](https://eff-certbot.readthedocs.io/en/stable/using.html#renewing-certificates).
