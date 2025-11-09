# Uptimatum Frontend

The Ultimate Self-Hosted Status Page Platform - Frontend

## Features

- ✅ **SolidJS** - Reactive UI framework
- ✅ **TypeScript** - Type-safe development
- ✅ **TailwindCSS** - Utility-first CSS framework
- ✅ **Solid Router** - Client-side routing
- ✅ **Real-time Updates** - Auto-refresh every 30 seconds
- ✅ **Responsive Design** - Works on all devices

## Setup

### Prerequisites

- Node.js (use nvm with `.nvmrc`)
- Bun (or npm/pnpm/yarn)

### Installation

1. Install dependencies:

```bash
source ~/.nvm/nvm.sh && nvm use
bun install
```

1. Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` if needed (defaults work for local development).

3. Start development server:

```bash
bun run dev
```

The frontend will be available at `http://localhost:5173`

## Development

### Scripts

- `bun run dev` - Start development server with hot reload
- `bun run build` - Build for production
- `bun run serve` - Preview production build

### API Proxy

In development, Vite automatically proxies API requests to the backend:

- `/api/*` → Backend API
- `/badge/*` → Badge endpoints
- `/doc` → OpenAPI documentation
- `/reference` → Scalar API reference

The proxy target can be configured via `VITE_API_URL` in `.env`.

### API Service

All API calls are centralized in `src/services/api.ts`:

```typescript
import { api } from "../services/api.js";

// List pages
const pages = await api.pages.listPages();

// Get page by slug
const page = await api.pages.getPageBySlug("demo");

// Get badge URL
const badgeUrl = api.badge.getBadgeUrl("demo");
```

This provides:

- ✅ Type-safe API calls
- ✅ Centralized error handling
- ✅ Consistent request/response handling
- ✅ Easy to mock for testing

## Production

### Building

```bash
bun run build
```

This creates an optimized production build in the `dist/` directory.

### Docker

The frontend is containerized with nginx for production:

```bash
docker build -t uptimatum-frontend .
docker run -p 80:80 uptimatum-frontend
```

### Kubernetes

The frontend is deployed as a Kubernetes deployment with:

- 2 replicas for high availability
- Rolling updates configured
- Nginx serving static files
- API proxying to backend service

## Configuration

### Environment Variables

- `VITE_API_URL` - Backend API URL (only needed if backend is on different host/port)

In production (Kubernetes), the frontend uses relative paths and nginx proxies requests to the backend service.

## Features

### Dashboard

- Lists all status pages
- Quick navigation to status pages
- Feature highlights

### Status Page

- Real-time endpoint status
- Uptime percentage (24h)
- Response time metrics
- Overall system status
- 24-hour status timeline
- Incident management (create, edit, delete)
- Embed code generation
- Status badge display
- Public status page link

### Embed Widget

- Lightweight embeddable widget
- Can be iframed into any website
- Shows endpoint status at a glance

## Integration with Backend

The frontend communicates with the backend API:

- `GET /api/pages` - List all pages
- `GET /api/pages/:slug` - Get page with endpoints and stats
- `GET /api/pages/:slug/timeline` - Get page timeline data
- `POST /api/pages` - Create new status page
- `PATCH /api/pages/:slug` - Update status page
- `GET /api/endpoints/:id/history` - Get endpoint check history
- `POST /api/endpoints` - Create new endpoint
- `DELETE /api/endpoints/:id` - Delete endpoint
- `GET /api/incidents?page_id=:id` - List incidents for a page
- `POST /api/incidents` - Create new incident
- `PATCH /api/incidents/:id` - Update incident
- `DELETE /api/incidents/:id` - Delete incident
- `GET /badge/:slug` - Get status badge SVG

All API calls are automatically proxied in development and handled by nginx in production.
