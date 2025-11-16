# Local Testing Guide

This guide will help you test Uptimatum locally before deploying to Kubernetes.

## Prerequisites

- Node.js (use nvm with `.nvmrc`)
- Bun (or npm/pnpm/yarn)
- PostgreSQL (local installation or Docker)
- Docker & Docker Compose (optional, for easier setup)

## Option 1: Docker Compose (Recommended)

The easiest way to test locally is using Docker Compose:

```bash
docker-compose up
```

This will:

- Start PostgreSQL 18 on `localhost:5432`
- Build and start backend on `http://localhost:3000`
- Build and start frontend on `http://localhost:5173`

Access the application at `http://localhost:5173`

**Note:** First run will build images, subsequent runs are faster.

**Stop services:**

```bash
docker-compose down
```

For more Docker details, see [DOCKER.md](./DOCKER.md)

## Option 4: Manual Setup (No Docker)

### Step 1: Setup PostgreSQL

#### Using Docker (Recommended)

```bash
docker run -d \
  --name uptimatum-postgres \
  -e POSTGRES_USER=uptimatum \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=uptimatum \
  -p 5432:5432 \
  postgres:15-alpine
```

#### Using Local PostgreSQL

```bash
# Create database and user
createdb uptimatum
psql uptimatum -c "CREATE USER uptimatum WITH PASSWORD 'password';"
psql uptimatum -c "GRANT ALL PRIVILEGES ON DATABASE uptimatum TO uptimatum;"
```

### Step 2: Setup Backend

```bash
cd backend

# Install dependencies
source ~/.nvm/nvm.sh && nvm use
bun install

# Create environment file
# If .env.example doesn't exist, create .env with:
cat > .env << EOF
DB_HOST=localhost
DB_PORT=5432
DB_NAME=uptimatum
DB_USER=uptimatum
DB_PASSWORD=password
PORT=3000
CHECK_INTERVAL=30
CHECK_TIMEOUT=10
NODE_ENV=development
EOF

# Or copy from example if it exists
[ -f .env.example ] && cp .env.example .env || echo "Created .env manually"

# Run database migrations
bun run db:generate
bun run db:push

# Start backend server
bun run dev
```

Backend will be available at `http://localhost:3000`

**Verify backend:**

- Health: <http://localhost:3000/health>
- API Docs: <http://localhost:3000/doc>
- Interactive Docs: <http://localhost:3000/reference>

### Step 3: Setup Frontend

Open a **new terminal**:

```bash
cd frontend

# Install dependencies
source ~/.nvm/nvm.sh && nvm use
bun install

# Create environment file (optional, defaults work)
cp .env.example .env

# Start frontend dev server
bun run dev
```

Frontend will be available at `http://localhost:3000` (Vite proxy handles API routing)

**Note:** Both frontend and backend use port 3000. Vite will automatically proxy API requests to the backend.

### Step 4: Test the Application

1. **Open browser**: <http://localhost:3000>
2. **Check dashboard**: Should show list of status pages
3. **View status page**: Click on a page or go to <http://localhost:3000/status/demo>
4. **Check API directly**: <http://localhost:3000/api/pages>
5. **View badge**: <http://localhost:3000/badge/demo>

## Testing Checklist

### Backend Tests

- [ ] Backend starts without errors
- [ ] Database connection successful
- [ ] Migrations applied correctly
- [ ] Health endpoint returns `{"status":"ok"}`
- [ ] API docs accessible at `/doc`
- [ ] Scalar docs accessible at `/reference`
- [ ] `GET /api/pages` returns pages array
- [ ] `GET /api/pages/demo` returns page with endpoints
- [ ] `GET /badge/demo` returns SVG badge

### Frontend Tests

- [ ] Frontend starts without errors
- [ ] Dashboard loads and shows pages
- [ ] Status page displays correctly
- [ ] Real-time updates work (check every 30s)
- [ ] Badge displays correctly
- [ ] Embed page works
- [ ] No console errors

### Integration Tests

- [ ] Frontend can fetch pages from backend
- [ ] Status page shows endpoint data
- [ ] Badge image loads correctly
- [ ] API proxy works in development

## Troubleshooting

### Backend won't start

**Database connection error:**

```bash
# Check PostgreSQL is running
docker ps | grep postgres
# or
pg_isready

# Verify connection
psql -h localhost -U uptimatum -d uptimatum
```

**Port already in use:**

```bash
# Change PORT in backend/.env
PORT=3001
```

### Frontend can't connect to backend

**Check Vite proxy:**

- Verify `vite.config.ts` has proxy configuration
- Check backend is running on port 3000
- Check browser console for errors

**Manual test:**

```bash
# Test backend directly
curl http://localhost:3000/api/pages

# Test from frontend
curl http://localhost:3000/api/pages
```

### Database migration errors

```bash
cd backend
# Reset database (WARNING: deletes all data)
bun run db:push --force

# Or manually drop and recreate
psql -h localhost -U uptimatum -d uptimatum -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
bun run db:push
```

## Testing with Different Ports

If you need to run backend and frontend on different ports:

### Backend on 3001, Frontend on 3000

1. **Backend `.env`:**

```env
PORT=3001
```

2. **Frontend `.env`:**

```env
VITE_API_URL=http://localhost:3001
```

3. **Update `vite.config.ts` proxy target:**

```typescript
proxy: {
  '/api': {
    target: process.env.VITE_API_URL || 'http://localhost:3001',
    // ...
  }
}
```

## Testing Health Checker

The health checker runs automatically every 30 seconds. To verify:

1. Check backend logs for health check messages
2. Wait 30 seconds after starting backend
3. Check database for new entries in `checks` table:

```bash
psql -h localhost -U uptimatum -d uptimatum -c "SELECT * FROM checks ORDER BY checked_at DESC LIMIT 5;"
```

## Next Steps

Once local testing passes:

1. All endpoints work correctly
2. Frontend displays data properly
3. Health checker is running
4. No errors in console/logs

You're ready to deploy to Kubernetes! Follow the main README for deployment instructions.
