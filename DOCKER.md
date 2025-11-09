# Docker Guide

This guide covers Docker usage for Uptimatum, including local development with Docker Compose and managing Docker images in Google Artifact Registry.

## Local Development with Docker Compose

### Quick Start

Run all services (PostgreSQL, Backend, Frontend) with Docker Compose:

```bash
docker-compose up
```

This will:

- Start PostgreSQL 18 on port 5432
- Build and start backend on port 3000
- Build and start frontend on port 5173

Access the application at `http://localhost:5173`

### Services

**PostgreSQL:**

- Image: `postgres:18-alpine`
- Port: `5432`
- Database: `uptimatum`
- User: `uptimatum` / Password: `password`

**Backend:**

- Built from `backend/Dockerfile`
- Port: `3000`
- Hot reload enabled (volume mounted)
- Auto-connects to PostgreSQL

**Frontend:**

- Built from `frontend/Dockerfile.dev` (development)
- Port: `5173`
- Hot reload enabled (volume mounted)
- Proxies API requests to backend

### Commands

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild images
docker-compose build

# Rebuild and restart
docker-compose up --build
```

### Development Mode

The docker-compose setup uses volume mounts for hot reload:

- `./backend/src` → `/app/src` (backend code)
- `./frontend/src` → `/app/src` (frontend code)

Changes to source files will automatically reload.

## Docker Images

### Building Images Locally

**Backend:**

```bash
cd backend
docker build -t uptimatum-backend:latest .
```

**Frontend:**

```bash
cd frontend
docker build -t uptimatum-frontend:latest .
```

### Image Structure

**Backend Dockerfile:**

- Multi-stage build
- Stage 1: Build with Bun
- Stage 2: Runtime with Bun
- Exposes port 3000

**Frontend Dockerfiles:**

- `Dockerfile.dev`: Development mode with Bun + Vite (hot reload)
- `Dockerfile`: Production build with Nginx (multi-stage)
  - Stage 1: Build with Bun + Vite
  - Stage 2: Serve with Nginx
  - Exposes port 80

## Google Artifact Registry

### Setup

Use the Docker registry management script:

```bash
./scripts/docker-registry.sh setup
```

This will:

- Enable Artifact Registry API
- Create repository `uptimatum` in `europe-west1`
- Configure Docker authentication

### Managing Images

**Build and Push:**

```bash
# Build and push all images
./scripts/docker-registry.sh push

# Build and push specific service
./scripts/docker-registry.sh push backend
./scripts/docker-registry.sh push frontend

# Build and push with custom tag
./scripts/docker-registry.sh push backend v2
```

**List Images:**

```bash
./scripts/docker-registry.sh list
```

**Pull Images:**

```bash
# Pull all images
./scripts/docker-registry.sh pull

# Pull specific service
./scripts/docker-registry.sh pull backend
./scripts/docker-registry.sh pull frontend latest
```

**Delete Images:**

```bash
./scripts/docker-registry.sh delete backend v1
```

### Manual Commands

**Build:**

```bash
export PROJECT_ID=$(gcloud config get-value project)
export REGION=europe-west1

# Backend
cd backend
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/uptimatum/backend:v1 .
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/uptimatum/backend:v1

# Frontend
cd frontend
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/uptimatum/frontend:v1 .
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/uptimatum/frontend:v1
```

**Configure Authentication:**

```bash
gcloud auth configure-docker europe-west1-docker.pkg.dev
```

## Image Tags

### Versioning Strategy

- `v1`, `v2`, etc. - Release versions
- `latest` - Latest stable release
- `dev` - Development builds

### Tagging

```bash
# Tag existing image
docker tag uptimatum-backend:latest \
  europe-west1-docker.pkg.dev/PROJECT_ID/uptimatum/backend:v1

# Push with multiple tags
docker tag uptimatum-backend:latest \
  europe-west1-docker.pkg.dev/PROJECT_ID/uptimatum/backend:v1
docker tag uptimatum-backend:latest \
  europe-west1-docker.pkg.dev/PROJECT_ID/uptimatum/backend:latest
docker push europe-west1-docker.pkg.dev/PROJECT_ID/uptimatum/backend:v1
docker push europe-west1-docker.pkg.dev/PROJECT_ID/uptimatum/backend:latest
```

## Troubleshooting

### Build Fails

**Check Dockerfile:**

```bash
docker build --no-cache -t test-image ./backend
```

**Check logs:**

```bash
docker-compose logs backend
docker-compose logs frontend
```

### Authentication Issues

```bash
# Re-authenticate
gcloud auth login
gcloud auth configure-docker europe-west1-docker.pkg.dev

# Check permissions
gcloud projects get-iam-policy PROJECT_ID
```

### Port Conflicts

If ports are already in use:

```bash
# Change ports in docker-compose.yml
ports:
  - "3001:3000"  # Backend on 3001
  - "5174:5173"  # Frontend on 5174
```

### Volume Mount Issues

On Linux, ensure proper permissions:

```bash
sudo chown -R $USER:$USER ./backend ./frontend
```

## Best Practices

1. **Use Multi-stage Builds**: Reduces final image size
2. **Layer Caching**: Order Dockerfile commands from least to most frequently changing
3. **.dockerignore**: Exclude unnecessary files from build context
4. **Version Tags**: Always tag images with version numbers
5. **Security**: Use non-root users in containers (already configured)
6. **Health Checks**: Use health checks for production deployments

## Image Sizes

Expected image sizes:

- **Backend**: ~150-200MB (Bun runtime)
- **Frontend**: ~50-80MB (Nginx + static files)

## CI/CD Integration

For automated builds, use the registry script in CI:

```bash
# In CI pipeline
./scripts/docker-registry.sh push backend ${CI_COMMIT_SHA}
./scripts/docker-registry.sh push frontend ${CI_COMMIT_SHA}
```

## References

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Google Artifact Registry](https://cloud.google.com/artifact-registry/docs)
- [Bun Docker Images](https://hub.docker.com/r/oven/bun)
