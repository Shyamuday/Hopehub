# HopeHub Backend Lightsail Handover

This note records the current low-cost backend deployment and the secrets/ports that must be kept safe.

## Server

| Item        | Value                                                         |
| ----------- | ------------------------------------------------------------- |
| Provider    | AWS Lightsail / Ubuntu 24.04                                  |
| Public IP   | `13.233.107.251`                                              |
| SSH user    | `ubuntu`                                                      |
| SSH key     | `C:\Users\Admin\Downloads\LightsailDefaultKey-ap-south-1.pem` |
| App path    | `/opt/hopehub/apps/api`                                       |
| API process | PM2 app `hopehub-api`                                         |
| Runtime     | Node 22 via `tsx`                                             |
| Database    | Local PostgreSQL 16                                           |

## URLs

Production API base URL:

```text
https://api.hopehub.in
```

Compatibility URL while DNS is checked:

```text
http://13.233.107.251
```

Health checks:

```bash
curl http://13.233.107.251/health
curl http://13.233.107.251/api/health
curl https://api.hopehub.in/health
```

Consumer OTP endpoint:

```text
https://api.hopehub.in/auth/request-otp
```

## Secrets To Keep

These files are on the server and must be backed up in a password manager:

```bash
sudo cat /etc/hopehub-db-pass
sudo cat /etc/hopehub-jwt-secret
```

They contain:

| File                      | Purpose                                    |
| ------------------------- | ------------------------------------------ |
| `/etc/hopehub-db-pass`    | Password for PostgreSQL user `hopehub_app` |
| `/etc/hopehub-jwt-secret` | JWT signing secret for API auth            |

Do not commit these values to GitHub.

GitHub Actions also needs this repository secret to deploy the backend automatically:

```text
LIGHTSAIL_SSH_PRIVATE_KEY
```

Its value should be the full private key content from the Lightsail `.pem` file.

## Database

| Item      | Value            |
| --------- | ---------------- |
| DB engine | PostgreSQL       |
| DB name   | `hopehub_clinic` |
| DB user   | `hopehub_app`    |
| DB host   | `localhost`      |
| DB port   | `5432`           |

Port `5432` is the normal PostgreSQL port. It is safe here because PostgreSQL should only be reachable locally from the server. Do not open inbound `5432` in Lightsail/AWS firewall rules.

Connection string format:

```text
postgresql://hopehub_app:<DB_PASSWORD>@localhost:5432/hopehub_clinic?schema=public
```

## Ports

| Port   | Purpose                                        | Public?                   |
| ------ | ---------------------------------------------- | ------------------------- |
| `22`   | SSH                                            | Only admin IPs/key access |
| `80`   | Nginx HTTP                                     | Yes                       |
| `443`  | HTTPS, once SSL terminates on server/DNS layer | Yes                       |
| `4000` | Node API internal app port                     | No public firewall needed |
| `5432` | PostgreSQL local DB                            | No                        |

## Useful Commands

SSH:

```bash
ssh -i "C:\Users\Admin\Downloads\LightsailDefaultKey-ap-south-1.pem" ubuntu@13.233.107.251
```

Check API process:

```bash
pm2 list
pm2 logs hopehub-api --lines 100
pm2 restart hopehub-api --update-env
pm2 save
```

Check Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl status nginx
```

Check PostgreSQL:

```bash
sudo systemctl status postgresql
sudo -u postgres psql -d hopehub_clinic
```

Check memory/disk:

```bash
free -h
df -h /
```

## Current Notes

- The server has a 2 GB swap file to help this small instance handle installs/builds.
- PM2 is saved for reboot restore.
- Nginx proxies both `/` and `/api/` to the API, so both `/health` and `/api/health` work.
- The app currently runs via `tsx src/index.ts`; later we should fix compiled production output and run plain Node.
- Prisma is configured for PostgreSQL. The repo has `apps/api/prisma/migrations/migration_lock.toml` with `provider = "postgresql"`.
