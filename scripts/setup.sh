#!/bin/bash
set -e

# Uptimatum - Complete Setup Script
# This script sets up everything from scratch: GCP project, GKE cluster, Artifact Registry, database, and deploys the app

export PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
export REGION=europe-west1
export ZONE=${REGION}-b
export REPO=uptimatum

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Uptimatum - Complete Setup${NC}"
echo "=================================="
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed${NC}"
    echo "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl is not installed${NC}"
    echo "Install it from: https://kubernetes.io/docs/tasks/tools/"
    exit 1
fi

# Check if helm is installed
if ! command -v helm &> /dev/null; then
    echo -e "${RED}❌ helm is not installed${NC}"
    echo "Install it from: https://helm.sh/docs/intro/install/"
    exit 1
fi

# Check if project is set
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}⚠️  No GCP project set${NC}"
    echo "Available projects:"
    gcloud projects list
    echo ""
    read -p "Enter PROJECT_ID: " PROJECT_ID
    gcloud config set project $PROJECT_ID
fi

echo -e "${GREEN}Configuration:${NC}"
echo "  Project ID: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Zone: $ZONE"
echo "  Repository: $REPO"
echo ""

read -p "Continue with setup? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 0
fi

echo ""
echo -e "${GREEN}Step 1/5: Enabling GCP APIs...${NC}"
gcloud services enable container.googleapis.com artifactregistry.googleapis.com || true
echo "✅ APIs enabled"

echo ""
echo -e "${GREEN}Step 2/5: Creating Artifact Registry...${NC}"
gcloud artifacts repositories create $REPO \
  --repository-format=docker \
  --location=$REGION \
  --description="Uptimatum Docker images" || echo "✅ Repository already exists"

# Configure Docker authentication
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet || true
echo "✅ Artifact Registry ready"

echo ""
echo -e "${GREEN}Step 3/5: Creating GKE Cluster...${NC}"
echo "This may take 5-10 minutes..."
gcloud container clusters create uptimatum-cluster \
  --zone=$ZONE \
  --num-nodes=3 \
  --machine-type=e2-standard-2 \
  --enable-autoscaling \
  --min-nodes=3 \
  --max-nodes=6 \
  --project=$PROJECT_ID || echo "✅ Cluster already exists"

# Get cluster credentials
gcloud container clusters get-credentials uptimatum-cluster --zone=$ZONE --project=$PROJECT_ID
echo "✅ GKE cluster ready"

echo ""
echo -e "${GREEN}Step 4/5: Installing Nginx Ingress Controller...${NC}"
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml || true

# Wait for ingress to be ready
echo "Waiting for Ingress Controller..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=300s || echo "⚠️  Ingress may still be starting"
echo "✅ Ingress Controller installed"

echo ""
echo -e "${GREEN}Step 5/5: Setting up Database...${NC}"
cd "$(dirname "$0")/.."
./scripts/setup-db.sh
echo "✅ Database ready"

echo ""
echo -e "${GREEN}Step 6/6: Building and Deploying Application...${NC}"
./scripts/deploy.sh

echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "Getting Ingress IP (this may take a few minutes)..."
sleep 10

EXTERNAL_IP=$(kubectl get ingress uptimatum-ingress -n uptimatum -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "Pending...")

if [ "$EXTERNAL_IP" != "Pending..." ] && [ -n "$EXTERNAL_IP" ]; then
    echo ""
    echo -e "${GREEN}Uptimatum is now running!${NC}"
    echo ""
    echo "Access your application at:"
    echo -e "  ${GREEN}http://$EXTERNAL_IP${NC}"
    echo -e "  ${GREEN}http://$EXTERNAL_IP/status/demo${NC}"
    echo ""
    echo "API Documentation:"
    echo -e "  ${GREEN}http://$EXTERNAL_IP/doc${NC}"
    echo -e "  ${GREEN}http://$EXTERNAL_IP/reference${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠️  Ingress IP is still being provisioned${NC}"
    echo "Check status with:"
    echo "  kubectl get ingress uptimatum-ingress -n uptimatum"
    echo ""
    echo "Once the IP is assigned, access at:"
    echo "  http://<EXTERNAL_IP>/status/demo"
fi

echo ""
echo "View all resources:"
echo "  kubectl get all -n uptimatum"
echo ""
echo "To stop everything, run:"
echo "  ./scripts/cleanup.sh"

