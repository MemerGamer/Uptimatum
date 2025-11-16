# Uptimatum - Complete Deployment Guide

**From zero to running application on Google Cloud Platform**

This guide walks you through deploying Uptimatum on Google Kubernetes Engine (GKE) from scratch.

## Table of Contents

- [Uptimatum - Complete Deployment Guide](#uptimatum---complete-deployment-guide)
  - [Table of Contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Quick Start (Automated)](#quick-start-automated)
    - [Option 1: Complete Setup (Recommended)](#option-1-complete-setup-recommended)
  - [Step-by-Step Manual Setup](#step-by-step-manual-setup)
    - [Step 1: Configure GCP Project](#step-1-configure-gcp-project)
    - [Step 2: Enable Required APIs](#step-2-enable-required-apis)
    - [Step 3: Create Artifact Registry](#step-3-create-artifact-registry)
    - [Step 4: Create GKE Cluster](#step-4-create-gke-cluster)
    - [Step 5: Install Nginx Ingress Controller](#step-5-install-nginx-ingress-controller)
    - [Step 6: Setup PostgreSQL Database](#step-6-setup-postgresql-database)
    - [Step 7: Build and Deploy Application](#step-7-build-and-deploy-application)
  - [Verify Deployment](#verify-deployment)
    - [Check Pods](#check-pods)
    - [Check Services](#check-services)
    - [Verify Primary-Replica Setup](#verify-primary-replica-setup)
    - [Check Ingress](#check-ingress)
    - [Access Application](#access-application)
  - [Individual Scripts](#individual-scripts)
  - [Cleanup (Remove Everything)](#cleanup-remove-everything)
    - [Option 1: Complete Cleanup (Recommended)](#option-1-complete-cleanup-recommended)
    - [Option 2: Manual Cleanup](#option-2-manual-cleanup)
  - [Resource Overview](#resource-overview)
    - [What Gets Created](#what-gets-created)
    - [Estimated Costs](#estimated-costs)
  - [Troubleshooting](#troubleshooting)
    - [Cluster Creation Fails](#cluster-creation-fails)
    - [Pods Not Starting](#pods-not-starting)
    - [Database Connection Issues](#database-connection-issues)
    - [Ingress IP Not Assigned](#ingress-ip-not-assigned)
    - [Image Build Fails](#image-build-fails)
  - [Updating the Application](#updating-the-application)
    - [Rebuild and Redeploy](#rebuild-and-redeploy)
    - [Rolling Update](#rolling-update)
    - [Scale Deployments](#scale-deployments)
  - [Configuration](#configuration)
    - [Environment Variables](#environment-variables)
    - [Database Configuration](#database-configuration)
    - [Kubernetes Manifests](#kubernetes-manifests)
  - [Next Steps](#next-steps)
  - [Additional Resources](#additional-resources)
  - [Quick Reference](#quick-reference)

---

## Prerequisites

Before starting, ensure you have:

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed and configured

   ```bash
   # Install: https://cloud.google.com/sdk/docs/install
   gcloud --version
   ```

3. **kubectl** installed

   ```bash
   # Install: https://kubernetes.io/docs/tasks/tools/
   kubectl version --client
   ```

4. **helm** installed

   ```bash
   # Install: https://helm.sh/docs/intro/install/
   helm version
   ```

---

## Quick Start (Automated)

### Option 1: Complete Setup (Recommended)

Run the master setup script to deploy everything:

```bash
./scripts/setup.sh
```

This script will:

1. Enable required GCP APIs
2. Create Artifact Registry
3. Create GKE cluster
4. Install Nginx Ingress
5. Setup PostgreSQL database
6. Build and deploy application

**Time:** ~15-20 minutes

---

## Step-by-Step Manual Setup

If you prefer to run each step manually:

### Step 1: Configure GCP Project

```bash
# Set your project ID
export PROJECT_ID=your-project-id
gcloud config set project $PROJECT_ID

# Verify
gcloud config get-value project
```

### Step 2: Enable Required APIs

```bash
gcloud services enable container.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

### Step 3: Create Artifact Registry

```bash
export REGION=europe-west1
export REPO=uptimatum

gcloud artifacts repositories create $REPO \
  --repository-format=docker \
  --location=$REGION \
  --description="Uptimatum Docker images"

# Configure Docker authentication
gcloud auth configure-docker ${REGION}-docker.pkg.dev
```

### Step 4: Create GKE Cluster

```bash
export ZONE=${REGION}-b

gcloud container clusters create uptimatum-cluster \
  --zone=$ZONE \
  --num-nodes=3 \
  --machine-type=e2-standard-2 \
  --enable-autoscaling \
  --min-nodes=3 \
  --max-nodes=6

# Get cluster credentials
gcloud container clusters get-credentials uptimatum-cluster --zone=$ZONE
```

**Note:** Cluster creation takes 5-10 minutes.

### Step 5: Install Nginx Ingress Controller

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.14.0/deploy/static/provider/cloud/deploy.yaml

# Wait for ingress to be ready
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=300s
```

### Step 6: Setup PostgreSQL Database

```bash
./scripts/setup-db.sh
```

This will:

- Add the Bitnami Helm repository
- Install/upgrade PostgreSQL using Bitnami Helm chart (`uptimatum-db` release)
- Create the `uptimatum` namespace (if missing)
- Deploy PostgreSQL cluster with 1 primary + 2 read replicas using StatefulSets
- Wait for all pods to become ready

**Primary-Replica Architecture:**

Bitnami PostgreSQL Helm chart sets up a master-replica architecture using StatefulSets:

- **1 Primary (Master) StatefulSet**: Handles all read-write operations with RWO storage
- **2 Read Replicas StatefulSet**: Read-only nodes that sync from primary via streaming replication with RWO storage
- **Services**:
  - `uptimatum-db-postgresql`: Points to PRIMARY (read-write) - used by backend
  - `uptimatum-db-postgresql-read`: Points to READ REPLICAS (read-only) - for read scaling

Each StatefulSet pod has its own PersistentVolumeClaim for data persistence.

### Step 7: Build and Deploy Application

```bash
./scripts/deploy.sh
```

This will:

- Build backend Docker image
- Build frontend Docker image
- Push images to Artifact Registry
- Deploy to Kubernetes

---

## Verify Deployment

### Check Pods

```bash
kubectl get pods -n uptimatum
```

Expected output:

```
NAME                                    READY   STATUS    RESTARTS   AGE
backend-xxx                              1/1     Running   0          2m
frontend-xxx                             1/1     Running   0          2m
uptimatum-db-postgresql-0                1/1     Running   0          5m
uptimatum-db-postgresql-read-0           1/1     Running   0          5m
uptimatum-db-postgresql-read-1           1/1     Running   0          5m
```

### Check Services

```bash
kubectl get svc -n uptimatum
```

Expected services for database:

- `uptimatum-db-postgresql`: Read-write service (points to primary StatefulSet)
- `uptimatum-db-postgresql-read`: Read-only service (points to read replica StatefulSet)

### Verify Primary-Replica Setup

```bash
# Check StatefulSets
kubectl get statefulset -n uptimatum

# Check which pods belong to primary vs read replicas
kubectl get pods -n uptimatum -l app.kubernetes.io/name=postgresql -o wide

# Check PersistentVolumeClaims (one per StatefulSet pod)
kubectl get pvc -n uptimatum
```

You should see:

- 1 StatefulSet for primary (1 pod)
- 1 StatefulSet for read replicas (2 pods)
- 3 PersistentVolumeClaims (one for each pod)

### Check Ingress

```bash
kubectl get ingress -n uptimatum
```

Get the external IP:

```bash
kubectl get ingress uptimatum-ingress -n uptimatum -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

**Note:** It may take 2-5 minutes for the IP to be assigned.

### Access Application

Once you have the external IP:

- **Dashboard:** `http://<EXTERNAL_IP>`
- **Status Page:** `http://<EXTERNAL_IP>/status/demo`
- **API Docs:** `http://<EXTERNAL_IP>/doc`
- **Interactive Docs:** `http://<EXTERNAL_IP>/reference`

---

## Individual Scripts

All scripts are located in the `scripts/` directory:

| Script           | Purpose                                                 |
| ---------------- | ------------------------------------------------------- |
| `setup.sh`       | **Master script** - Complete setup from scratch         |
| `setup-infra.sh` | Setup GCP infrastructure (APIs, Artifact Registry, GKE) |
| `setup-db.sh`    | Deploy Bitnami PostgreSQL cluster with StatefulSets     |
| `deploy.sh`      | Build images and deploy to Kubernetes                   |
| `cleanup.sh`     | **Master cleanup** - Remove all resources               |
| `demo.sh`        | Demo presentation script                                |
| `test-local.sh`  | Local testing setup                                     |

---

## Cleanup (Remove Everything)

### Option 1: Complete Cleanup (Recommended)

```bash
./scripts/cleanup.sh
```

This will:

1. Delete Kubernetes namespace (all resources)
2. Optionally delete GKE cluster
3. Optionally delete Artifact Registry

### Option 2: Manual Cleanup

```bash
# Delete Kubernetes resources
kubectl delete namespace uptimatum

# Delete GKE cluster
gcloud container clusters delete uptimatum-cluster \
  --zone=europe-west1-b

# Delete Artifact Registry
gcloud artifacts repositories delete uptimatum \
  --location=europe-west1
```

---

## Resource Overview

### What Gets Created

**GCP Resources:**

- GKE Cluster (`uptimatum-cluster`)
- Artifact Registry (`uptimatum`)
- Load Balancer (via Ingress)

**Kubernetes Resources:**

- Namespace: `uptimatum`
- Deployments: `backend` (3 replicas), `frontend` (2 replicas)
- Services: `backend`, `frontend`
- Ingress: `uptimatum-ingress`
- PostgreSQL StatefulSets: `uptimatum-db-postgresql` (1 primary) + `uptimatum-db-postgresql-read` (2 replicas)
- ConfigMap: `uptimatum-config`
- Secrets: `uptimatum-secret` (database credentials managed by Helm)

### Estimated Costs

**GKE Cluster:**

- 3 nodes × e2-standard-2 = ~$150-200/month
- Autoscaling: 3-6 nodes based on load

**Artifact Registry:**

- Storage: ~$0.10/GB/month
- Network egress: varies

**Load Balancer:**

- ~$18/month (regional)

**Total:** ~$170-220/month (estimate)

---

## Troubleshooting

### Cluster Creation Fails

```bash
# Check quotas
gcloud compute project-info describe --project=$PROJECT_ID

# Check if APIs are enabled
gcloud services list --enabled
```

### Pods Not Starting

```bash
# Check pod logs
kubectl logs -n uptimatum <pod-name>

# Check pod events
kubectl describe pod -n uptimatum <pod-name>

# Check all resources
kubectl get all -n uptimatum
```

### Database Connection Issues

```bash
# Check PostgreSQL pods
kubectl get pods -n uptimatum | grep uptimatum-db

# Check PostgreSQL logs (primary)
kubectl logs -n uptimatum pod/uptimatum-db-postgresql-0

# Check PostgreSQL logs (read replica)
kubectl logs -n uptimatum pod/uptimatum-db-postgresql-read-0

# Test connection to primary
kubectl exec -it -n uptimatum pod/uptimatum-db-postgresql-0 -- \
  psql -U uptimatum -d uptimatum -h uptimatum-db-postgresql
```

### Ingress IP Not Assigned

```bash
# Check ingress status
kubectl describe ingress -n uptimatum uptimatum-ingress

# Check ingress controller
kubectl get pods -n ingress-nginx

# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller
```

### Image Build Fails

```bash
# Check build logs
gcloud builds list --limit=5

# View specific build
gcloud builds log <BUILD_ID>

# Test Docker authentication
gcloud auth configure-docker europe-west1-docker.pkg.dev
```

---

## Updating the Application

### Rebuild and Redeploy

```bash
# Update code, then:
./scripts/deploy.sh
```

### Rolling Update

```bash
# Update image tag in deployment
kubectl set image deployment/backend \
  backend=europe-west1-docker.pkg.dev/$PROJECT_ID/uptimatum/backend:v2 \
  -n uptimatum

# Watch rollout
kubectl rollout status deployment/backend -n uptimatum
```

### Scale Deployments

```bash
# Scale backend
kubectl scale deployment backend --replicas=5 -n uptimatum

# Scale frontend
kubectl scale deployment frontend --replicas=3 -n uptimatum
```

---

## Configuration

### Environment Variables

Backend environment variables are set via:

- **ConfigMap:** `k8s/configmap.yaml`
- **Secret:** `k8s/secret.yaml`

### Database Configuration

PostgreSQL cluster is defined in:

- **Helm Values:** `k8s/postgresql-values.yaml`
- **Helm Chart:** Bitnami PostgreSQL (installed via `setup-db.sh`)

### Kubernetes Manifests

All Kubernetes resources are in:

- **Directory:** `k8s/`

---

## Next Steps

After successful deployment:

1. **Access the application** using the external IP
2. **Test all endpoints** (dashboard, status pages, API docs)
3. **Monitor resources** with `kubectl get all -n uptimatum`
4. **Set up monitoring** (optional: Prometheus, Grafana)
5. **Configure custom domain** (optional: update Ingress)

---

## Additional Resources

- [GKE Documentation](https://cloud.google.com/kubernetes-engine/docs)
- [Artifact Registry Documentation](https://cloud.google.com/artifact-registry/docs)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)

---

## Quick Reference

```bash
# Setup everything
./scripts/setup.sh

# Check status
kubectl get all -n uptimatum

# Get external IP
kubectl get ingress uptimatum-ingress -n uptimatum

# View logs
kubectl logs -n uptimatum deployment/backend
kubectl logs -n uptimatum deployment/frontend

# Cleanup everything
./scripts/cleanup.sh
```

---

**Need help?** Check the troubleshooting section or review the logs.
