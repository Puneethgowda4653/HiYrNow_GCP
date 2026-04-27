# ============================================
# HiYrNow - GCP Deployment Script (Windows PowerShell)
# ============================================
# This script deploys the HiYrNow application to Google Cloud Platform.
#
# Prerequisites:
#   1. Google Cloud SDK (gcloud) installed and authenticated
#   2. Docker Desktop installed and running
#   3. A GCP project with billing enabled
#
# Usage:
#   .\deploy.ps1 [-Command backend|frontend|all|setup]
# ============================================

param(
    [ValidateSet("backend", "frontend", "all", "setup", "cloudbuild")]
    [string]$Command = "all"
)

$ErrorActionPreference = "Stop"

# ---- Configuration (Update these for your project) ----
$PROJECT_ID = if ($env:GCP_PROJECT_ID) { $env:GCP_PROJECT_ID } else { "your-gcp-project-id" }
$REGION = if ($env:GCP_REGION) { $env:GCP_REGION } else { "europe-west1" }
$AR_HOSTNAME = "$REGION-docker.pkg.dev"
$AR_REPOSITORY = "hiyrnow"
$BACKEND_SERVICE = "hiyrnow-backend"
$FRONTEND_SERVICE = "hiyrnow-frontend"
$BACKEND_IMAGE = "$AR_HOSTNAME/$PROJECT_ID/$AR_REPOSITORY/$BACKEND_SERVICE"
$FRONTEND_IMAGE = "$AR_HOSTNAME/$PROJECT_ID/$AR_REPOSITORY/$FRONTEND_SERVICE"

function Write-Info { param([string]$Message) Write-Host "[INFO] $Message" -ForegroundColor Blue }
function Write-Success { param([string]$Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warn { param([string]$Message) Write-Host "[WARN] $Message" -ForegroundColor Yellow }
function Write-Err { param([string]$Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

# ---- Initial Setup ----
function Setup-GCP {
    Write-Info "Setting up GCP project: $PROJECT_ID"

    gcloud config set project $PROJECT_ID

    Write-Info "Enabling required GCP APIs..."
    gcloud services enable `
        run.googleapis.com `
        cloudbuild.googleapis.com `
        artifactregistry.googleapis.com `
        secretmanager.googleapis.com `
        redis.googleapis.com `
        --project=$PROJECT_ID

    Write-Info "Creating Artifact Registry repository..."
    gcloud artifacts repositories create $AR_REPOSITORY `
        --repository-format=docker `
        --location=$REGION `
        --description="HiYrNow Docker images" `
        --project=$PROJECT_ID 2>$null

    gcloud auth configure-docker $AR_HOSTNAME --quiet

    Write-Success "GCP setup complete!"
    Write-Host ""
    Write-Info "Next steps - Create secrets in Secret Manager:"
    Write-Host '  echo "your-mongodb-uri" | gcloud secrets create MONGODB_URI --data-file=-'
    Write-Host '  echo "your-session-secret" | gcloud secrets create SESSION_SECRET --data-file=-'
    Write-Host '  echo "your-redis-host" | gcloud secrets create REDIS_HOST --data-file=-'
    Write-Host '  echo "your-redis-port" | gcloud secrets create REDIS_PORT --data-file=-'
    Write-Host '  echo "your-redis-password" | gcloud secrets create REDIS_PASSWORD --data-file=-'
    Write-Host '  echo "your-email-pass" | gcloud secrets create EMAIL_PASS --data-file=-'
    Write-Host '  echo "your-gemini-key" | gcloud secrets create GEMINI_API_KEY --data-file=-'
}

# ---- Deploy Backend ----
function Deploy-Backend {
    Write-Info "Deploying Backend to Cloud Run..."
    $TAG = Get-Date -Format "yyyyMMdd-HHmmss"

    Write-Info "Building backend Docker image..."
    docker build `
        -t "${BACKEND_IMAGE}:${TAG}" `
        -t "${BACKEND_IMAGE}:latest" `
        -f job-portal-node-server-master/Dockerfile `
        job-portal-node-server-master/

    Write-Info "Pushing backend image to Artifact Registry..."
    docker push "${BACKEND_IMAGE}:${TAG}"
    docker push "${BACKEND_IMAGE}:latest"

    Write-Info "Deploying backend to Cloud Run..."
    gcloud run deploy $BACKEND_SERVICE `
        --image="${BACKEND_IMAGE}:${TAG}" `
        --platform=managed `
        --region=$REGION `
        --allow-unauthenticated `
        --port=8080 `
        --memory=512Mi `
        --cpu=1 `
        --min-instances=0 `
        --max-instances=10 `
        --timeout=300 `
        --concurrency=80 `
        --set-env-vars="NODE_ENV=production,PORT=8080,TELEMETRY_ENABLED=false" `
        --set-secrets="MONGODB_URI=MONGODB_URI:latest,SESSION_SECRET=SESSION_SECRET:latest,REDIS_HOST=REDIS_HOST:latest,REDIS_PORT=REDIS_PORT:latest,EMAIL_PASS=EMAIL_PASS:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest" `
        --project=$PROJECT_ID `
        --quiet

    $BACKEND_URL = gcloud run services describe $BACKEND_SERVICE --region=$REGION --format="value(status.url)" --project=$PROJECT_ID
    Write-Success "Backend deployed to: $BACKEND_URL"
}

# ---- Deploy Frontend ----
function Deploy-Frontend {
    Write-Info "Deploying Frontend to Cloud Run..."
    $TAG = Get-Date -Format "yyyyMMdd-HHmmss"

    Write-Info "Building frontend Docker image..."
    docker build `
        -t "${FRONTEND_IMAGE}:${TAG}" `
        -t "${FRONTEND_IMAGE}:latest" `
        -f app/Dockerfile `
        app/

    Write-Info "Pushing frontend image to Artifact Registry..."
    docker push "${FRONTEND_IMAGE}:${TAG}"
    docker push "${FRONTEND_IMAGE}:latest"

    Write-Info "Deploying frontend to Cloud Run..."
    gcloud run deploy $FRONTEND_SERVICE `
        --image="${FRONTEND_IMAGE}:${TAG}" `
        --platform=managed `
        --region=$REGION `
        --allow-unauthenticated `
        --port=8080 `
        --memory=256Mi `
        --cpu=1 `
        --min-instances=0 `
        --max-instances=5 `
        --timeout=60 `
        --concurrency=200 `
        --project=$PROJECT_ID `
        --quiet

    $FRONTEND_URL = gcloud run services describe $FRONTEND_SERVICE --region=$REGION --format="value(status.url)" --project=$PROJECT_ID
    Write-Success "Frontend deployed to: $FRONTEND_URL"
}

# ---- Main ----
switch ($Command) {
    "setup" { Setup-GCP }
    "backend" { Deploy-Backend }
    "frontend" { Deploy-Frontend }
    "all" {
        Deploy-Backend
        Deploy-Frontend
        Write-Host ""
        Write-Success "Full deployment complete!"
    }
    "cloudbuild" {
        Write-Info "Deploying via Cloud Build..."
        $COMMIT = try { git rev-parse --short HEAD } catch { Get-Date -Format "yyyyMMddHHmmss" }
        gcloud builds submit `
            --config=cloudbuild.yaml `
            --substitutions="_AR_HOSTNAME=$AR_HOSTNAME,_AR_PROJECT_ID=$PROJECT_ID,_AR_REPOSITORY=$AR_REPOSITORY,_BACKEND_SERVICE=$BACKEND_SERVICE,_FRONTEND_SERVICE=$FRONTEND_SERVICE,_DEPLOY_REGION=$REGION,COMMIT_SHA=$COMMIT" `
            --project=$PROJECT_ID `
            .
        Write-Success "Cloud Build deployment submitted!"
    }
}
