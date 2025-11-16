#!/bin/bash
set -e

# Get PROJECT_ID from environment variable or gcloud config
export PROJECT_ID=${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || echo "")}
export REGION=${REGION:-europe-west1}

if [ -z "$PROJECT_ID" ]; then
    echo "ERROR: No GCP project set."
    echo "Set it as environment variable: export PROJECT_ID=your-project-id"
    echo "Or run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Building images..."
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo ""

cd "$PROJECT_ROOT/backend"
gcloud builds submit --tag ${REGION}-docker.pkg.dev/${PROJECT_ID}/uptimatum/backend:v1
# Also tag as latest
gcloud artifacts docker images add-tag ${REGION}-docker.pkg.dev/${PROJECT_ID}/uptimatum/backend:v1 ${REGION}-docker.pkg.dev/${PROJECT_ID}/uptimatum/backend:latest --quiet || true

cd "$PROJECT_ROOT/frontend"
gcloud builds submit --tag ${REGION}-docker.pkg.dev/${PROJECT_ID}/uptimatum/frontend:v1
# Also tag as latest
gcloud artifacts docker images add-tag ${REGION}-docker.pkg.dev/${PROJECT_ID}/uptimatum/frontend:v1 ${REGION}-docker.pkg.dev/${PROJECT_ID}/uptimatum/frontend:latest --quiet || true

cd "$PROJECT_ROOT"

echo ""
echo "Updating manifests with PROJECT_ID..."
# Create temporary directory for modified manifests
TMP_DIR=$(mktemp -d)
# Copy only Kubernetes manifest files (exclude Helm values files)
cp k8s/*.yaml "$TMP_DIR/" 2>/dev/null || true
# Remove Helm values file if it was copied
rm -f "$TMP_DIR/postgresql-values.yaml"
# Remove namespace.yaml - namespace is created by setup-db.sh via Helm
# If namespace doesn't exist, it will be created by setup-db.sh first
rm -f "$TMP_DIR/namespace.yaml"

# Replace PROJECT_ID in deployment files
for file in "$TMP_DIR"/*-deployment.yaml; do
    if [ -f "$file" ]; then
        sed -i.bak "s|PROJECT_ID|${PROJECT_ID}|g" "$file"
        rm -f "${file}.bak"
    fi
done

echo "Deploying to Kubernetes..."
# Apply manifests (suppress warnings about namespace annotation)
kubectl apply -f "$TMP_DIR/" 2>&1 | grep -v "missing the kubectl.kubernetes.io/last-applied-configuration annotation" || true

# Cleanup temp directory
rm -rf "$TMP_DIR"

echo ""
echo "Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s \
  deployment/backend deployment/frontend -n uptimatum || true

echo ""
echo "✅ Deployment complete!"
echo ""
kubectl get pods,svc,ingress -n uptimatum

