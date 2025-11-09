#!/bin/bash
set -e

export PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
export REGION=europe-west1
export ZONE=${REGION}-b
export REPO=uptimatum

if [ -z "$PROJECT_ID" ]; then
    echo "ERROR: No GCP project set. Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "Setting up infrastructure..."
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Enable APIs
echo "Enabling GCP APIs..."
gcloud services enable container.googleapis.com artifactregistry.googleapis.com --project=$PROJECT_ID || true

# Create Artifact Registry
echo "Creating Artifact Registry..."
gcloud artifacts repositories create $REPO \
  --repository-format=docker \
  --location=$REGION \
  --description="Uptimatum Docker images" \
  --project=$PROJECT_ID || echo "✅ Repository already exists"

# Configure Docker
echo "Configuring Docker authentication..."
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet || true

# Create GKE Cluster
echo "Creating GKE cluster (this may take 5-10 minutes)..."
gcloud container clusters create uptimatum-cluster \
  --zone=$ZONE \
  --num-nodes=3 \
  --machine-type=e2-standard-2 \
  --enable-autoscaling \
  --min-nodes=3 \
  --max-nodes=6 \
  --project=$PROJECT_ID || echo "✅ Cluster already exists"

# Get cluster credentials
echo "Getting cluster credentials..."
gcloud container clusters get-credentials uptimatum-cluster --zone=$ZONE --project=$PROJECT_ID

# Install Nginx Ingress
echo "Installing Nginx Ingress Controller..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml || true

# Wait for ingress
echo "Waiting for Ingress Controller to be ready..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=300s || echo "⚠️  Ingress may still be starting"

echo ""
echo "✅ Infrastructure ready!"

