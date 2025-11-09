#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Setting up PostgreSQL cluster..."

# Add Helm repo
echo "Adding Bitnami Helm repository..."
helm repo add bitnami https://charts.bitnami.com/bitnami || true
helm repo update

# Create namespace if it doesn't exist
echo "Creating namespace..."
kubectl create namespace uptimatum || echo "✅ Namespace already exists"

# Install PostgreSQL HA (3 nodes) using values file
echo "Installing PostgreSQL HA cluster (this may take a few minutes)..."
helm install postgres bitnami/postgresql-ha \
  --namespace uptimatum \
  --values "$PROJECT_ROOT/helm/postgresql-ha-values.yaml" \
  --wait || echo "✅ PostgreSQL may already be installed"

# Verify
echo ""
echo "Verifying PostgreSQL deployment..."
kubectl get statefulset,pvc -n uptimatum

echo ""
echo "✅ PostgreSQL cluster ready!"

