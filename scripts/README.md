# Scripts Directory

This directory contains all deployment and management scripts for Uptimatum.

## Table of Contents

- [Scripts Directory](#scripts-directory)
  - [Table of Contents](#table-of-contents)
  - [Master Scripts](#master-scripts)
    - [`setup.sh` - Complete Setup (0 → Running App)](#setupsh---complete-setup-0--running-app)
    - [`cleanup.sh` - Complete Cleanup (Running App → 0)](#cleanupsh---complete-cleanup-running-app--0)
  - [Individual Scripts](#individual-scripts)
    - [`setup-infra.sh`](#setup-infrash)
    - [`setup-db.sh`](#setup-dbsh)
    - [`deploy.sh`](#deploysh)
    - [`demo.sh`](#demosh)
    - [`test-local.sh`](#test-localsh)
    - [`docker-registry.sh`](#docker-registrysh)
  - [Usage](#usage)

## Master Scripts

### `setup.sh` - Complete Setup (0 → Running App)

**One command to deploy everything from scratch:**

```bash
./scripts/setup.sh
```

Sets up:

- GCP APIs
- Artifact Registry
- GKE Cluster
- Nginx Ingress
- PostgreSQL Database (Bitnami Helm chart with StatefulSets)
- Application Deployment

**Time:** ~15-20 minutes

### `cleanup.sh` - Complete Cleanup (Running App → 0)

**One command to remove everything:**

```bash
./scripts/cleanup.sh
```

Removes:

- PostgreSQL Helm release
- Kubernetes resources
- GKE Cluster (optional)
- Artifact Registry (optional)

## Individual Scripts

### `setup-infra.sh`

Sets up GCP infrastructure:

- Enables required APIs
- Creates Artifact Registry
- Creates GKE cluster
- Installs Nginx Ingress

### `setup-db.sh`

Deploys PostgreSQL HA cluster using Bitnami PostgreSQL Helm chart:

- 1 primary (master) StatefulSet with RWO storage
- 2 read replica StatefulSets with RWO storage
- Total: 3 nodes using StatefulSets (meets Kubernetes exam requirements)
- Creates services: `uptimatum-db-postgresql-primary` (primary) and `uptimatum-db-postgresql-read` (replicas)

### `deploy.sh`

Builds Docker images and deploys to Kubernetes:

- Builds backend image
- Builds frontend image
- Pushes to Artifact Registry
- Deploys to Kubernetes (excludes Helm values files and namespace from kubectl apply)

### `demo.sh`

Demo presentation script for showcasing Kubernetes features:

- Shows pods distribution
- Displays StatefulSets and PersistentVolumeClaims
- Shows ConfigMap/Secret usage
- Gets Ingress IP
- Demonstrates scaling
- Shows rolling update commands

### `test-local.sh`

Local testing setup script (PostgreSQL + Backend + Frontend).

### `docker-registry.sh`

Docker registry management script for Google Artifact Registry.

**Commands:**

- `setup` - Setup Artifact Registry repository
- `build` - Build Docker images locally
- `push` - Build and push images to registry
- `pull` - Pull images from registry
- `list` - List images in registry
- `delete` - Delete images from registry

**Examples:**

```bash
./scripts/docker-registry.sh setup
./scripts/docker-registry.sh push
./scripts/docker-registry.sh push backend v2
./scripts/docker-registry.sh list
```

## Usage

**Quick Start:**

```bash
# Deploy everything
./scripts/setup.sh

# Cleanup everything
./scripts/cleanup.sh
```

**Step-by-step:**

```bash
./scripts/setup-infra.sh
./scripts/setup-db.sh
./scripts/deploy.sh
```

For detailed instructions, see [../DEPLOYMENT.md](../DEPLOYMENT.md)
