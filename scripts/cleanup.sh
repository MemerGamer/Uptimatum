#!/bin/bash
set -e

# Uptimatum - Complete Cleanup Script
# This script removes all Uptimatum resources from GCP

export PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
export ZONE=europe-west1-b
export REGION=europe-west1

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${RED}Uptimatum - Complete Cleanup${NC}"
echo "=================================="
echo ""

if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}⚠️  No GCP project set${NC}"
    read -p "Enter PROJECT_ID: " PROJECT_ID
    gcloud config set project $PROJECT_ID
fi

echo -e "${YELLOW}⚠️  This will delete Uptimatum Kubernetes resources!${NC}"
echo ""
echo "Resources to be deleted:"
echo "  - Kubernetes namespace 'uptimatum' (all pods, services, deployments)"
echo ""
echo "Resources NOT deleted (preserved):"
echo "  - GKE cluster 'uptimatum-cluster' (optional, will ask)"
echo "  - Artifact Registry repository 'uptimatum' (preserved - contains Docker images)"
echo ""
read -p "Are you sure you want to continue? (yes/N) " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
echo -e "${RED}Step 1/2: Deleting Kubernetes resources...${NC}"
cd "$(dirname "$0")/.."
kubectl delete namespace uptimatum --ignore-not-found=true || true
echo "✅ Kubernetes resources deleted"

echo ""
echo -e "${RED}Step 2/2: Deleting GKE Cluster (optional)...${NC}"
read -p "Delete GKE cluster 'uptimatum-cluster'? (yes/N) " -r
if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    gcloud container clusters delete uptimatum-cluster \
      --zone=$ZONE \
      --project=$PROJECT_ID \
      --quiet || echo "⚠️  Cluster may not exist or already deleted"
    echo "✅ GKE cluster deleted"
else
    echo "Skipping cluster deletion"
fi

echo ""
echo -e "${GREEN}Artifact Registry (preserved)...${NC}"
echo "Artifact Registry repository 'uptimatum' remains to keep Docker images."
echo "To delete it manually, run:"
echo "  gcloud artifacts repositories delete uptimatum --location=$REGION --project=$PROJECT_ID"

echo ""
echo -e "${GREEN}✅ Cleanup complete!${NC}"
echo ""
echo "Note: Some resources may take a few minutes to fully delete."
echo "You can verify with:"
echo "  gcloud container clusters list"
echo "  gcloud artifacts repositories list"
