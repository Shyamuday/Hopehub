#!/usr/bin/env bash
# Deploy selected frontend bundles into one S3 bucket, each under an app prefix.
# A single CloudFront distribution can then route by host using
# deploy/cloudfront/frontend-host-router.js.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATIC="$ROOT/deploy/static"
APPS="${HOPEHUB_STATIC_APPS:-patient,admin,doctor,operations,healing}"

if [ -z "${FRONTEND_BUCKET:-}" ]; then
  echo "FRONTEND_BUCKET is not set; skipping unified frontend deployment."
  exit 0
fi

should_deploy() {
  case ",$APPS," in
    *",$1,"*) return 0 ;;
    *) return 1 ;;
  esac
}

deploy_app() {
  local app="$1"
  local dir="$STATIC/$app"
  if [ ! -d "$dir" ]; then
    echo "Static output missing for $app: $dir"
    exit 1
  fi

  echo "==> Deploying $app to s3://${FRONTEND_BUCKET}/${app}/"
  aws s3 sync "$dir" "s3://${FRONTEND_BUCKET}/${app}" \
    --delete \
    --exclude "index.html" \
    --exclude "*/index.html" \
    --exclude "private-shell.html" \
    --exclude "runtime-config.js" \
    --exclude "robots.txt" \
    --exclude "sitemap.xml" \
    --exclude "ads.txt" \
    --cache-control "public,max-age=31536000,immutable"

  aws s3 sync "$dir" "s3://${FRONTEND_BUCKET}/${app}" \
    --delete \
    --exclude "*" \
    --include "index.html" \
    --include "*/index.html" \
    --include "private-shell.html" \
    --content-type "text/html; charset=utf-8" \
    --cache-control "no-cache,no-store,must-revalidate"

  if [ -f "$dir/runtime-config.js" ]; then
    aws s3 cp "$dir/runtime-config.js" "s3://${FRONTEND_BUCKET}/${app}/runtime-config.js" \
      --content-type "application/javascript; charset=utf-8" \
      --cache-control "no-cache,no-store,must-revalidate"
  fi

  if [ -f "$dir/robots.txt" ]; then
    aws s3 cp "$dir/robots.txt" "s3://${FRONTEND_BUCKET}/${app}/robots.txt" \
      --content-type "text/plain; charset=utf-8" \
      --cache-control "public,max-age=3600"
  fi

  if [ -f "$dir/sitemap.xml" ]; then
    aws s3 cp "$dir/sitemap.xml" "s3://${FRONTEND_BUCKET}/${app}/sitemap.xml" \
      --content-type "application/xml; charset=utf-8" \
      --cache-control "public,max-age=3600"
  fi

  if [ -f "$dir/ads.txt" ]; then
    aws s3 cp "$dir/ads.txt" "s3://${FRONTEND_BUCKET}/${app}/ads.txt" \
      --content-type "text/plain; charset=utf-8" \
      --cache-control "public,max-age=3600"
  fi
}

if should_deploy patient; then deploy_app patient; fi
if should_deploy admin; then deploy_app admin; fi
if should_deploy doctor; then deploy_app doctor; fi
if should_deploy operations; then deploy_app operations; fi
if should_deploy healing; then deploy_app healing; fi

if [ -n "${FRONTEND_CLOUDFRONT_DISTRIBUTION_ID:-}" ]; then
  echo "==> Invalidating unified CloudFront distribution ${FRONTEND_CLOUDFRONT_DISTRIBUTION_ID}"
  invalidation_id="$(
    aws cloudfront create-invalidation \
    --distribution-id "$FRONTEND_CLOUDFRONT_DISTRIBUTION_ID" \
      --paths "/*" \
      --query 'Invalidation.Id' \
      --output text
  )"
  echo "==> Waiting for CloudFront invalidation ${invalidation_id}"
  aws cloudfront wait invalidation-completed \
    --distribution-id "$FRONTEND_CLOUDFRONT_DISTRIBUTION_ID" \
    --id "$invalidation_id"
else
  echo "FRONTEND_CLOUDFRONT_DISTRIBUTION_ID is not set; skipped CloudFront invalidation."
fi
