# Deployment Guide - Kotiz on luzz.me Homeserver

## Architecture

```
                    Internet
                       │
                       ▼
              [Caddy Reverse Proxy]
                 ├─────┴─────┐
                 ▼           ▼
    kotiz.luzz.me        kotiz-api.luzz.me
         │                    │
         ▼                    ▼
    [kotiz-pwa]          [kotiz-api]
    nginx :3002          fastify :3001
         │                    │
         │                    ▼
         │              [kotiz-db]
         │              postgres :5432
         │                    │
         └────────────────────┘
              Docker Network
```

- **kotiz.luzz.me** - PWA Frontend (nginx serving static files)
- **kotiz-api.luzz.me** - API Backend (Fastify)

## Prerequisites

- Docker and Docker Compose installed on the homeserver
- Caddy configured as reverse proxy
- DNS configured for `kotiz.luzz.me` and `kotiz-api.luzz.me`

## Deployment Steps

### 1. Clone the repository on the homeserver

```bash
ssh -p 2222 user@luzz.me

cd /data
git clone https://github.com/1Luzz/Kotiz.git kotiz
cd kotiz
```

### 2. Configure environment variables

```bash
cp .env.example .env
nano .env
```

Fill in the secrets:
```env
DB_PASSWORD=<openssl rand -base64 32>
JWT_ACCESS_SECRET=<openssl rand -base64 32>
JWT_REFRESH_SECRET=<openssl rand -base64 32>
API_PORT=3001
PWA_PORT=3002
```

### 3. Update Caddy configuration

```bash
# Add the Kotiz config to your Caddyfile
cat deploy/Caddyfile >> /data/Caddyfile

# Reload Caddy
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

### 4. Configure DNS on Namecheap

Add these DNS records:

| Type | Host | Value |
|------|------|-------|
| A | kotiz | 78.121.58.117 |
| A | kotiz-api | 78.121.58.117 |
| AAAA | kotiz | 2a02:8424:8e04:4801:9fff:665d:b8a4:abcd |
| AAAA | kotiz-api | 2a02:8424:8e04:4801:9fff:665d:b8a4:abcd |

### 5. Build and start containers

```bash
cd /data/kotiz

# Build Docker images
docker-compose build

# Run migrations (first time only)
docker-compose --profile setup up -d
docker-compose logs -f migrate  # Wait for completion

# Start the application
docker-compose up -d

# Check logs
docker-compose logs -f
```

### 6. Verify deployment

- PWA: https://kotiz.luzz.me
- API Health: https://kotiz-api.luzz.me/auth/health
- Check PWA is installable (browser should show install prompt)

## Maintenance

### View logs
```bash
docker-compose logs -f api
docker-compose logs -f pwa
```

### Restart services
```bash
docker-compose restart api pwa
```

### Update (after git pull)
```bash
cd /data/kotiz
git pull
docker-compose build --no-cache
docker-compose up -d
```

### Backup database
```bash
docker exec kotiz-db pg_dump -U kotiz kotiz > backup_$(date +%Y%m%d).sql
```

### Restore database
```bash
cat backup.sql | docker exec -i kotiz-db psql -U kotiz kotiz
```

## Troubleshooting

### Container won't start
```bash
docker-compose logs api
docker-compose logs pwa
docker ps -a
```

### CORS errors
Check that `CORS_ORIGINS` in docker-compose.yml includes `https://kotiz.luzz.me`

### PWA not installing
- Ensure HTTPS is working on both domains
- Check manifest: `curl https://kotiz.luzz.me/manifest.json`
- Check service worker in DevTools > Application > Service Workers

### API unreachable from PWA
- Check DNS resolution: `nslookup kotiz-api.luzz.me`
- Test API directly: `curl https://kotiz-api.luzz.me/auth/health`
- Check CORS headers in browser DevTools Network tab
