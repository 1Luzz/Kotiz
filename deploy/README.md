# Deployment Guide - Kotiz on luzz.me Homeserver

## Prerequisites

- Docker and Docker Compose installed on the homeserver
- Caddy configured as reverse proxy
- Domain `kotiz.luzz.me` pointing to your server

## Deployment Steps

### 1. Prepare the project on your local machine

```bash
# Clone/copy the project to a location accessible from the homeserver
# Or use git to pull directly on the server
```

### 2. Transfer to homeserver

```bash
# Using SCP (from Windows PowerShell)
scp -P 2222 -r "C:\Users\natch\PycharmProjects\Caisse noire" user@luzz.me:/data/kotiz

# Or using rsync (recommended for updates)
rsync -avz -e "ssh -p 2222" --exclude 'node_modules' --exclude '.git' \
  "C:\Users\natch\PycharmProjects\Caisse noire/" user@luzz.me:/data/kotiz/
```

### 3. Configure environment on homeserver

```bash
ssh -p 2222 user@luzz.me

cd /data/kotiz

# Copy and edit environment variables
cp .env.example .env
nano .env

# Generate secure secrets
openssl rand -base64 32  # Use for JWT_ACCESS_SECRET
openssl rand -base64 32  # Use for JWT_REFRESH_SECRET
openssl rand -base64 32  # Use for DB_PASSWORD
```

Example `.env`:
```env
DB_USER=kotiz
DB_PASSWORD=<generated-password>
DB_NAME=kotiz
JWT_ACCESS_SECRET=<generated-secret>
JWT_REFRESH_SECRET=<generated-secret>
PUBLIC_URL=https://kotiz.luzz.me
API_PORT=3001
```

### 4. Update Caddy configuration

Add the contents of `deploy/Caddyfile` to your main Caddyfile:

```bash
# Edit your Caddyfile
nano /data/Caddyfile

# Add the kotiz.luzz.me block from deploy/Caddyfile
```

Reload Caddy:
```bash
docker exec -it caddy caddy reload --config /etc/caddy/Caddyfile
```

### 5. Update DNS

Add DNS records for `kotiz.luzz.me`:

| Type | Host | Value |
|------|------|-------|
| A | kotiz | 78.121.58.117 |
| AAAA | kotiz | 2a02:8424:8e04:4801:9fff:665d:b8a4:abcd |

### 6. Build and start containers

```bash
cd /data/kotiz

# Build the Docker image
docker-compose build

# Run migrations first
docker-compose --profile setup up -d

# Wait for migrations to complete
docker-compose logs -f migrate

# Start the application
docker-compose up -d

# Check logs
docker-compose logs -f api
```

### 7. Verify deployment

- Open https://kotiz.luzz.me in your browser
- Check the PWA is installable (look for install prompt)
- Test API: `curl https://kotiz.luzz.me/auth/health`

## Maintenance

### View logs
```bash
docker-compose logs -f api
```

### Restart
```bash
docker-compose restart api
```

### Update
```bash
# Pull latest code
git pull

# Rebuild and restart
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
# Check logs
docker-compose logs api

# Check container status
docker ps -a

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Database connection issues
```bash
# Check database is healthy
docker-compose ps db

# Test connection
docker exec -it kotiz-db psql -U kotiz -d kotiz -c "SELECT 1;"
```

### PWA not installing
- Ensure HTTPS is working
- Check manifest.json is accessible: `curl https://kotiz.luzz.me/manifest.json`
- Check service worker: Open DevTools > Application > Service Workers

## Network architecture

```
Internet
    │
    ▼
[Caddy Reverse Proxy :443]
    │
    ▼
[kotiz-api :3001]  ◄─── Docker network ───► [kotiz-db :5432]
    │
    └── Serves: API + Static PWA files
```
