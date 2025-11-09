# Helm Charts Configuration

This directory contains Helm chart values files for deploying infrastructure components.

## Files

- `postgresql-ha-values.yaml` - Configuration for Bitnami PostgreSQL HA chart (3-node cluster)

## Usage

### PostgreSQL HA

The PostgreSQL HA cluster is installed via `setup-db.sh` which uses this values file:

```bash
helm install postgres bitnami/postgresql-ha \
  --namespace uptimatum \
  --values helm/postgresql-ha-values.yaml
```

### Updating Values

To modify PostgreSQL configuration, edit `postgresql-ha-values.yaml` and upgrade:

```bash
helm upgrade postgres bitnami/postgresql-ha \
  --namespace uptimatum \
  --values helm/postgresql-ha-values.yaml
```

## Configuration

### PostgreSQL HA Settings

- **Replica Count**: 3 PostgreSQL nodes
- **Database**: `uptimatum`
- **Username**: `uptimatum`
- **Persistence**: 2Gi per node
- **Pgpool Replicas**: 2 (for connection pooling)

### Security Note

⚠️ **Important**: The password in this file is for demonstration purposes. In production, use Kubernetes Secrets or external secret management.

