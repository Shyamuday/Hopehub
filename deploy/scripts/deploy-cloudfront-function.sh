#!/usr/bin/env bash
# Publish the checked-in CloudFront Function used by unified frontend hosting.
# Run from repository root.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FUNCTION_NAME="${FRONTEND_CLOUDFRONT_FUNCTION_NAME:-}"
FUNCTION_FILE="$ROOT/deploy/cloudfront/frontend-host-router.js"

if [ -z "$FUNCTION_NAME" ]; then
  echo "FRONTEND_CLOUDFRONT_FUNCTION_NAME is not set; skipped CloudFront Function update."
  exit 0
fi

if [ ! -f "$FUNCTION_FILE" ]; then
  echo "CloudFront Function source missing: $FUNCTION_FILE"
  exit 1
fi

echo "==> Updating CloudFront Function ${FUNCTION_NAME}"
etag="$(
  aws cloudfront describe-function \
    --name "$FUNCTION_NAME" \
    --stage DEVELOPMENT \
    --query 'ETag' \
    --output text
)"

updated_etag="$(
  aws cloudfront update-function \
    --name "$FUNCTION_NAME" \
    --if-match "$etag" \
    --function-code "fileb://${FUNCTION_FILE}" \
    --function-config "Comment=Hope Hub unified frontend host router,Runtime=cloudfront-js-1.0" \
    --query 'ETag' \
    --output text
)"

aws cloudfront publish-function \
  --name "$FUNCTION_NAME" \
  --if-match "$updated_etag" \
  >/dev/null

echo "CloudFront Function ${FUNCTION_NAME} published."
