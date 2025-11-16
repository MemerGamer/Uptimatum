#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Setting up Bitnami PostgreSQL cluster with StatefulSets..."

# Add Helm repo for Bitnami charts
echo "Adding Bitnami Helm repository..."
helm repo add bitnami https://charts.bitnami.com/bitnami || true
helm repo update

# Create namespace if it doesn't exist
echo "Creating application namespace..."
kubectl create namespace uptimatum || echo "✅ Namespace already exists"

# Install / upgrade PostgreSQL using Bitnami Helm chart
echo "Installing PostgreSQL cluster (1 primary + 2 read replicas)..."
helm upgrade --install uptimatum-db bitnami/postgresql \
  --namespace uptimatum \
  --values "$PROJECT_ROOT/k8s/postgresql-values.yaml" \
  --wait \
  --timeout=600s

echo "Waiting for PostgreSQL StatefulSet pods to become ready (this may take a few minutes)..."
# Wait for primary StatefulSet
echo "Waiting for primary PostgreSQL pod..."
kubectl wait --namespace uptimatum \
  --for=condition=ready pod \
  -l app.kubernetes.io/name=postgresql,app.kubernetes.io/component=primary \
  --timeout=600s || echo "⚠️  Primary pod readiness check timed out, verify manually with: kubectl get pods -n uptimatum"

# Wait for read replica StatefulSet pods
# Note: Read replicas may take longer to initialize as they sync from primary
echo "Waiting for read replica PostgreSQL pods..."
# Try waiting for read replicas, but don't fail if they're not ready yet
if kubectl wait --namespace uptimatum \
  --for=condition=ready pod \
  -l app.kubernetes.io/name=postgresql,app.kubernetes.io/component=read \
  --timeout=300s 2>/dev/null; then
  echo "✅ Read replica pods are ready"
else
  echo "⚠️  Read replica pods are still initializing (this is normal - they sync from primary)"
  echo "   Check status with: kubectl get pods -n uptimatum -l app.kubernetes.io/name=postgresql"
fi

echo ""
echo "✅ PostgreSQL cluster ready!"
echo ""
echo "Services created:"
echo "  - uptimatum-db-postgresql: Primary (read-write) service"
echo "  - uptimatum-db-postgresql-read: Read replicas (read-only) service"
echo ""
echo "StatefulSets created:"
kubectl get statefulset -n uptimatum | grep uptimatum-db || true

