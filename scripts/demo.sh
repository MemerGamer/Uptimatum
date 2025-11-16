#!/bin/bash

echo "Uptimatum Demo Script"
echo "========================"
echo ""

echo "1. Showing pods (30s)"
kubectl get pods -n uptimatum -o wide
echo ""

echo "2. Showing StatefulSets (PostgreSQL cluster with 1 primary + 2 read replicas) (30s)"
kubectl get statefulset -n uptimatum
echo ""
echo "   Showing PersistentVolumeClaims (one per StatefulSet pod):"
kubectl get pvc -n uptimatum
echo ""
echo "   PostgreSQL StatefulSet details:"
kubectl get statefulset -n uptimatum -l app.kubernetes.io/name=postgresql -o wide
echo ""

echo "3. Showing ConfigMap/Secret (30s)"
kubectl describe deployment backend -n uptimatum | grep -A 10 "Environment"
echo ""

echo "4. Getting Ingress IP..."
EXTERNAL_IP=$(kubectl get ingress uptimatum-ingress -n uptimatum -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "Pending...")
echo "External IP: $EXTERNAL_IP"
echo "Access at: http://$EXTERNAL_IP/status/demo"
echo ""

echo "5. Scaling backend (45s)"
kubectl scale deployment backend -n uptimatum --replicas=5
kubectl get pods -n uptimatum -w &
SCALE_PID=$!
sleep 10
kill $SCALE_PID 2>/dev/null || true
echo ""

echo "6. Rolling update example (45s)"
echo "To perform rolling update, run:"
export PROJECT_ID=$(gcloud config get-value project)
export REGION=europe-west1
echo "kubectl set image deployment/backend backend=${REGION}-docker.pkg.dev/${PROJECT_ID}/uptimatum/backend:v2 -n uptimatum"
echo "kubectl rollout status deployment/backend -n uptimatum"
echo ""

echo "✅ Demo complete!"

