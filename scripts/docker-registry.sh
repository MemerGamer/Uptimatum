#!/bin/bash
set -e

# Uptimatum - Docker Registry Management Script
# This script helps manage Docker images in Google Artifact Registry

export PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
export REGION=europe-west1

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}ERROR: No GCP project set${NC}"
    echo "Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

REPO_NAME="uptimatum"
REPO_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"

function show_help() {
    echo "Uptimatum Docker Registry Management"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  build          Build Docker images locally"
    echo "  push           Build and push images to Artifact Registry"
    echo "  pull           Pull images from Artifact Registry"
    echo "  list           List images in Artifact Registry"
    echo "  delete         Delete images from Artifact Registry"
    echo "  setup          Setup Artifact Registry repository"
    echo ""
    echo "Examples:"
    echo "  $0 build                    # Build images locally"
    echo "  $0 push                     # Build and push to registry"
    echo "  $0 push backend             # Build and push only backend"
    echo "  $0 push frontend            # Build and push only frontend"
    echo "  $0 list                     # List all images"
}

function setup_registry() {
    echo -e "${GREEN}Setting up Artifact Registry...${NC}"
    
    # Enable API
    gcloud services enable artifactregistry.googleapis.com --project=$PROJECT_ID || true
    
    # Create repository
    gcloud artifacts repositories create $REPO_NAME \
      --repository-format=docker \
      --location=$REGION \
      --description="Uptimatum Docker images" \
      --project=$PROJECT_ID || echo "Repository already exists"
    
    # Configure Docker authentication
    gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet || true
    
    echo -e "${GREEN}✅ Artifact Registry ready!${NC}"
    echo "Repository URL: ${REPO_URL}"
}

function build_image() {
    local service=$1
    local tag=${2:-v1}
    
    if [ "$service" = "backend" ]; then
        echo -e "${GREEN}Building backend image...${NC}"
        cd "$PROJECT_ROOT/backend"
        docker build -t ${REPO_URL}/backend:${tag} .
        docker tag ${REPO_URL}/backend:${tag} ${REPO_URL}/backend:latest
        echo -e "${GREEN}✅ Backend image built${NC}"
    elif [ "$service" = "frontend" ]; then
        echo -e "${GREEN}Building frontend image...${NC}"
        cd "$PROJECT_ROOT/frontend"
        docker build -t ${REPO_URL}/frontend:${tag} .
        docker tag ${REPO_URL}/frontend:${tag} ${REPO_URL}/frontend:latest
        echo -e "${GREEN}✅ Frontend image built${NC}"
    else
        echo -e "${GREEN}Building all images...${NC}"
        build_image backend $tag
        build_image frontend $tag
    fi
}

function push_image() {
    local service=$1
    local tag=${2:-v1}
    
    if [ -z "$service" ]; then
        echo -e "${GREEN}Pushing all images...${NC}"
        push_image backend $tag
        push_image frontend $tag
    else
        echo -e "${GREEN}Pushing ${service} image...${NC}"
        docker push ${REPO_URL}/${service}:${tag}
        docker push ${REPO_URL}/${service}:latest
        echo -e "${GREEN}✅ ${service} image pushed${NC}"
    fi
}

function pull_image() {
    local service=$1
    local tag=${2:-latest}
    
    if [ -z "$service" ]; then
        echo -e "${GREEN}Pulling all images...${NC}"
        pull_image backend $tag
        pull_image frontend $tag
    else
        echo -e "${GREEN}Pulling ${service} image...${NC}"
        docker pull ${REPO_URL}/${service}:${tag}
        echo -e "${GREEN}✅ ${service} image pulled${NC}"
    fi
}

function list_images() {
    echo -e "${GREEN}Listing images in Artifact Registry...${NC}"
    gcloud artifacts docker images list ${REPO_URL} \
      --project=$PROJECT_ID \
      --format="table(IMAGE,TAGS,CREATE_TIME)" || echo "No images found"
}

function delete_image() {
    local service=$1
    local tag=${2:-latest}
    
    if [ -z "$service" ]; then
        echo -e "${RED}ERROR: Please specify service (backend or frontend)${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}⚠️  Deleting ${service}:${tag}...${NC}"
    read -p "Are you sure? (yes/N) " -r
    if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        gcloud artifacts docker images delete ${REPO_URL}/${service}:${tag} \
          --project=$PROJECT_ID \
          --quiet || echo "Image not found"
        echo -e "${GREEN}✅ Image deleted${NC}"
    else
        echo "Cancelled"
    fi
}

# Main command handler
case "${1:-help}" in
    setup)
        setup_registry
        ;;
    build)
        build_image "${2:-all}" "${3:-v1}"
        ;;
    push)
        build_image "${2:-all}" "${3:-v1}"
        push_image "${2:-all}" "${3:-v1}"
        ;;
    pull)
        pull_image "${2:-all}" "${3:-latest}"
        ;;
    list)
        list_images
        ;;
    delete)
        delete_image "$2" "$3"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        show_help
        exit 1
        ;;
esac

