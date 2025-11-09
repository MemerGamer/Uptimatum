#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Setting up CloudNativePG PostgreSQL cluster..."

# Add Helm repo for CloudNativePG operator
echo "Adding CloudNativePG Helm repository..."
helm repo add cnpg https://cloudnative-pg.github.io/charts || true
helm repo update

# Install / upgrade CloudNativePG operator
echo "Installing CloudNativePG operator..."
helm upgrade --install cnpg cnpg/cloudnative-pg \
  --namespace cnpg-system \
  --create-namespace \
  --wait

# Create namespace if it doesn't exist
echo "Creating application namespace..."
kubectl create namespace uptimatum || echo "✅ Namespace already exists"

# Apply database bootstrap secret and cluster definition
echo "Applying CloudNativePG cluster resources..."
kubectl apply -f "$PROJECT_ROOT/k8s/db-bootstrap-secret.yaml"
kubectl apply -f "$PROJECT_ROOT/k8s/postgres-cluster.yaml"

echo "Waiting for CloudNativePG cluster to become ready (this may take a few minutes)..."
kubectl wait --namespace uptimatum \
  --for=condition=Ready \
  cluster/uptimatum-db \
  --timeout=600s || echo "⚠️  Cluster readiness check timed out, verify manually with: kubectl get pods -n uptimatum"

# Additional safety: wait for pods to report ready
kubectl wait --namespace uptimatum \
  --for=condition=Ready \
  pod -l postgresql.cnpg.io/cluster=uptimatum-db \
  --timeout=600s || echo "⚠️  Pods are still starting, check status with: kubectl get pods -n uptimatum"

echo ""
echo "✅ CloudNativePG cluster ready!"

