#!/bin/bash
set -e

echo "Uptimatum Local Testing Setup"
echo "=================================="
echo ""

# Check if PostgreSQL is running
if ! docker ps | grep -q uptimatum-postgres; then
  echo "Starting PostgreSQL with Docker Compose..."
  docker-compose up -d postgres
  
  echo "Waiting for PostgreSQL to be ready..."
  sleep 5
  
  # Wait for PostgreSQL to be healthy
  until docker exec uptimatum-postgres pg_isready -U uptimatum > /dev/null 2>&1; do
    echo "   Waiting for PostgreSQL..."
    sleep 2
  done
  echo "✅ PostgreSQL is ready!"
else
  echo "✅ PostgreSQL is already running"
fi

echo ""
echo "Backend Setup"
echo "----------------"
cd backend

# Check if .env exists, create if not
if [ ! -f .env ]; then
  echo "📝 Creating .env file..."
  if [ -f .env.example ]; then
    cp .env.example .env
  else
    # Create .env with defaults for local testing
    cat > .env << 'ENVEOF'
DB_HOST=localhost
DB_PORT=5432
DB_NAME=uptimatum
DB_USER=uptimatum
DB_PASSWORD=password
PORT=3000
CHECK_INTERVAL=30
CHECK_TIMEOUT=10
NODE_ENV=development
ENVEOF
  fi
  echo "✅ Created .env file"
else
  echo "✅ .env file exists"
fi

# Install dependencies if needed
if [ ! -d node_modules ]; then
  echo "Installing backend dependencies..."
  source ~/.nvm/nvm.sh && nvm use
  bun install
  echo "✅ Dependencies installed"
else
  echo "✅ Dependencies already installed"
fi

# Run migrations
echo "Running database migrations..."
source ~/.nvm/nvm.sh && nvm use
bun run db:push || echo "⚠️  Migration may have failed, but continuing..."

echo ""
echo "Starting Backend..."
echo "   Backend will run on http://localhost:3000"
echo "   API Docs: http://localhost:3000/doc"
echo "   Interactive Docs: http://localhost:3000/reference"
echo ""
echo "   Press Ctrl+C to stop"
echo ""

# Start backend in background
bun run dev &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Check if backend is running
if curl -s http://localhost:3000/health > /dev/null; then
  echo "✅ Backend is running!"
else
  echo "⚠️  Backend may not be ready yet"
fi

echo ""
echo "Frontend Setup"
echo "-----------------"
cd ../frontend

# Check if .env exists, create if not
if [ ! -f .env ]; then
  echo "📝 Creating .env file..."
  if [ -f .env.example ]; then
    cp .env.example .env
  else
    # Create minimal .env (frontend doesn't need much, Vite proxy handles defaults)
    touch .env
  fi
  echo "✅ Created .env file"
else
  echo "✅ .env file exists"
fi

# Install dependencies if needed
if [ ! -d node_modules ]; then
  echo "Installing frontend dependencies..."
  source ~/.nvm/nvm.sh && nvm use
  bun install
  echo "✅ Dependencies installed"
else
  echo "✅ Dependencies already installed"
fi

echo ""
echo "Starting Frontend..."
echo "   Frontend will run on http://localhost:3000"
echo "   (Vite will proxy API requests to backend)"
echo ""
echo "   Press Ctrl+C to stop both services"
echo ""

# Trap Ctrl+C to kill both processes
trap "echo ''; echo 'Stopping services...'; kill $BACKEND_PID 2>/dev/null; exit" INT

# Start frontend (this will block)
bun run dev

