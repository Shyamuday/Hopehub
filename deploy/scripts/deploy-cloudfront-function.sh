#!/usr/bin/env bash
# Publish the checked-in CloudFront Function used by unified frontend hosting.
# Run from repository root.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FUNCTION_NAME="${FRONTEND_CLOUDFRONT_FUNCTION_NAME:-}"
FUNCTION_FILE="$ROOT/deploy/cloudfront/frontend-host-router.js"
MINIFIED_FUNCTION_FILE="$(mktemp)"
trap 'rm -f "$MINIFIED_FUNCTION_FILE"' EXIT

if [ -z "$FUNCTION_NAME" ]; then
  echo "FRONTEND_CLOUDFRONT_FUNCTION_NAME is not set; skipped CloudFront Function update."
  exit 0
fi

if [ ! -f "$FUNCTION_FILE" ]; then
  echo "CloudFront Function source missing: $FUNCTION_FILE"
  exit 1
fi

(
  cd "$ROOT"
  npx --no-install esbuild "$FUNCTION_FILE" \
    --minify \
    --target=es5 \
    --log-level=error \
    --outfile="$MINIFIED_FUNCTION_FILE"
)

function_size="$(wc -c < "$MINIFIED_FUNCTION_FILE" | tr -d '[:space:]')"
if [ "$function_size" -gt 10000 ]; then
  echo "CloudFront Function is ${function_size} bytes after minification; maximum is 10000."
  exit 1
fi

aws_function_file="$MINIFIED_FUNCTION_FILE"
if command -v cygpath >/dev/null 2>&1; then
  aws_function_file="$(cygpath -w "$MINIFIED_FUNCTION_FILE")"
fi

echo "==> Updating CloudFront Function ${FUNCTION_NAME} (${function_size} bytes)"
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
    --function-code "fileb://${aws_function_file}" \
    --function-config "Comment=Hope Hub unified frontend host router,Runtime=cloudfront-js-1.0" \
    --query 'ETag' \
    --output text
)"

aws cloudfront publish-function \
  --name "$FUNCTION_NAME" \
  --if-match "$updated_etag" \
  >/dev/null

echo "CloudFront Function ${FUNCTION_NAME} published."
