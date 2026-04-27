#!/bin/bash
# ============================================
# HiYrNow - GCP Deployment Script
# ============================================
# This script deploys the HiYrNow application to Google Cloud Platform.
#
# Prerequisites:
#   1. Google Cloud SDK (gcloud) installed and authenticated
#   2. Docker installed (for local builds only)
#   3. A GCP project with billing enabled
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh [backend|frontend|all] [--setup]
# ============================================

set -euo pipefail

# ---- Configuration (Update these for your project) ----
PROJECT_ID="${GCP_PROJECT_ID:-your-gcp-project-id}"
REGION="${GCP_REGION:-europe-west1}"
AR_HOSTNAME="${GCP_REGION:-europe-west1}-docker.pkg.dev"
AR_REPOSITORY="hiyrnow"
BACKEND_SERVICE="hiyrnow-backend"
FRONTEND_SERVICE="hiyrnow-frontend"
BACKEND_IMAGE="${AR_HOSTNAME}/${PROJECT_ID}/${AR_REPOSITORY}/${BACKEND_SERVICE}"
FRONTEND_IMAGE="${AR_HOSTNAME}/${PROJECT_ID}/${AR_REPOSITORY}/${FRONTEND_SERVICE}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ---- Initial Setup (run once) ----
setup_gcp() {
    log_info "Setting up GCP project: ${PROJECT_ID}"

    # Set the active project
    gcloud config set project "${PROJECT_ID}"

    # Enable required APIs
    log_info "Enabling required GCP APIs..."
    gcloud services enable \
        run.googleapis.com \
        cloudbuild.googleapis.com \
        artifactregistry.googleapis.com \
        secretmanager.googleapis.com \
        redis.googleapis.com \
        --project="${PROJECT_ID}"

    # Create Artifact Registry repository
    log_info "Creating Artifact Registry repository..."
    gcloud artifacts repositories create "${AR_REPOSITORY}" \
        --repository-format=docker \
        --location="${REGION}" \
        --description="HiYrNow Docker images" \
        --project="${PROJECT_ID}" 2>/dev/null || log_warn "Repository already exists"

    # Configure Docker authentication for Artifact Registry
    gcloud auth configure-docker "${AR_HOSTNAME}" --quiet

    log_success "GCP setup complete!"
    echo ""
    log_info "Next steps:"
    echo "  1. Create secrets in Secret Manager (see below)"
    echo "  2. Run: ./deploy.sh all"
    echo ""
    log_info "Create secrets with:"
    echo "  echo -n 'your-mongodb-uri' | gcloud secrets create MONGODB_URI --data-file=-"
    echo "  echo -n 'your-session-secret' | gcloud secrets create SESSION_SECRET --data-file=-"
    echo "  echo -n 'your-redis-host' | gcloud secrets create REDIS_HOST --data-file=-"
    echo "  echo -n 'your-redis-port' | gcloud secrets create REDIS_PORT --data-file=-"
    echo "  echo -n 'your-redis-password' | gcloud secrets create REDIS_PASSWORD --data-file=-"
    echo "  echo -n 'your-email-pass' | gcloud secrets create EMAIL_PASS --data-file=-"
    echo "  echo -n 'your-gemini-key' | gcloud secrets create GEMINI_API_KEY --data-file=-"
}

# ---- Deploy Backend ----
deploy_backend() {
    log_info "Deploying Backend to Cloud Run..."

    TAG=$(date +%Y%m%d-%H%M%S)

    # Build backend image
    log_info "Building backend Docker image..."
    docker build \
        -t "${BACKEND_IMAGE}:${TAG}" \
        -t "${BACKEND_IMAGE}:latest" \
        -f job-portal-node-server-master/Dockerfile \
        job-portal-node-server-master/

    # Push to Artifact Registry
    log_info "Pushing backend image to Artifact Registry..."
    docker push "${BACKEND_IMAGE}:${TAG}"
    docker push "${BACKEND_IMAGE}:latest"

    # Deploy to Cloud Run
    log_info "Deploying backend to Cloud Run..."
    gcloud run deploy "${BACKEND_SERVICE}" \
        --image="${BACKEND_IMAGE}:${TAG}" \
        --platform=managed \
        --region="${REGION}" \
        --allow-unauthenticated \
        --port=8080 \
        --memory=512Mi \
        --cpu=1 \
        --min-instances=0 \
        --max-instances=10 \
        --timeout=300 \
        --concurrency=80 \
        --set-env-vars="NODE_ENV=production,PORT=8080,TELEMETRY_ENABLED=false" \
        --set-secrets="MONGODB_URI=MONGODB_URI:latest,SESSION_SECRET=SESSION_SECRET:latest,REDIS_HOST=REDIS_HOST:latest,REDIS_PORT=REDIS_PORT:latest,EMAIL_PASS=EMAIL_PASS:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest" \
        --project="${PROJECT_ID}" \
        --quiet

    BACKEND_URL=$(gcloud run services describe "${BACKEND_SERVICE}" --region="${REGION}" --format="value(status.url)" --project="${PROJECT_ID}")
    log_success "Backend deployed to: ${BACKEND_URL}"
}

# ---- Deploy Frontend ----
deploy_frontend() {
    log_info "Deploying Frontend to Cloud Run..."

    TAG=$(date +%Y%m%d-%H%M%S)

    # Build frontend image
    log_info "Building frontend Docker image..."
    docker build \
        -t "${FRONTEND_IMAGE}:${TAG}" \
        -t "${FRONTEND_IMAGE}:latest" \
        -f app/Dockerfile \
        app/

    # Push to Artifact Registry
    log_info "Pushing frontend image to Artifact Registry..."
    docker push "${FRONTEND_IMAGE}:${TAG}"
    docker push "${FRONTEND_IMAGE}:latest"

    # Deploy to Cloud Run
    log_info "Deploying frontend to Cloud Run..."
    gcloud run deploy "${FRONTEND_SERVICE}" \
        --image="${FRONTEND_IMAGE}:${TAG}" \
        --platform=managed \
        --region="${REGION}" \
        --allow-unauthenticated \
        --port=8080 \
        --memory=256Mi \
        --cpu=1 \
        --min-instances=0 \
        --max-instances=5 \
        --timeout=60 \
        --concurrency=200 \
        --project="${PROJECT_ID}" \
        --quiet

    FRONTEND_URL=$(gcloud run services describe "${FRONTEND_SERVICE}" --region="${REGION}" --format="value(status.url)" --project="${PROJECT_ID}")
    log_success "Frontend deployed to: ${FRONTEND_URL}"
}

# ---- Deploy using Cloud Build (CI/CD) ----
deploy_cloudbuild() {
    log_info "Deploying via Cloud Build..."

    gcloud builds submit \
        --config=cloudbuild.yaml \
        --substitutions="_AR_HOSTNAME=${AR_HOSTNAME},_AR_PROJECT_ID=${PROJECT_ID},_AR_REPOSITORY=${AR_REPOSITORY},_BACKEND_SERVICE=${BACKEND_SERVICE},_FRONTEND_SERVICE=${FRONTEND_SERVICE},_DEPLOY_REGION=${REGION},COMMIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)" \
        --project="${PROJECT_ID}" \
        .

    log_success "Cloud Build deployment submitted!"
}

# ---- Main ----
main() {
    local command="${1:-all}"
    local flag="${2:-}"

    if [[ "${flag}" == "--setup" ]] || [[ "${command}" == "--setup" ]]; then
        setup_gcp
        return 0
    fi

    # Verify gcloud is authenticated
    if ! gcloud auth print-access-token &>/dev/null; then
        log_error "Not authenticated with gcloud. Run: gcloud auth login"
        exit 1
    fi

    case "${command}" in
        backend)
            deploy_backend
            ;;
        frontend)
            deploy_frontend
            ;;
        all)
            deploy_backend
            deploy_frontend
            echo ""
            log_success "Full deployment complete!"
            ;;
        cloudbuild)
            deploy_cloudbuild
            ;;
        *)
            echo "Usage: ./deploy.sh [backend|frontend|all|cloudbuild] [--setup]"
            echo ""
            echo "Commands:"
            echo "  --setup     Initial GCP project setup (run once)"
            echo "  backend     Deploy only the backend service"
            echo "  frontend    Deploy only the frontend service"
            echo "  all         Deploy both backend and frontend (default)"
            echo "  cloudbuild  Submit build via Cloud Build CI/CD"
            exit 1
            ;;
    esac
}

main "$@"
