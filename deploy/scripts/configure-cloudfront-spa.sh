#!/usr/bin/env bash
set -euo pipefail

distribution_id="${1:?Usage: configure-cloudfront-spa.sh <distribution-id>}"

work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

current_json="$work_dir/current.json"
desired_json="$work_dir/desired.json"

aws cloudfront get-distribution-config --id "$distribution_id" > "$current_json"
etag="$(jq -r '.ETag' "$current_json")"

jq '
  def spa_error($code): {
    ErrorCode: $code,
    ResponsePagePath: "/index.html",
    ResponseCode: "200",
    ErrorCachingMinTTL: 0
  };

  def upsert_spa_error($items; $code):
    if any($items[]?; .ErrorCode == $code) then
      [$items[] | if .ErrorCode == $code then spa_error($code) else . end]
    else
      $items + [spa_error($code)]
    end;

  .DistributionConfig
  | .CustomErrorResponses = (.CustomErrorResponses // { Quantity: 0, Items: [] })
  | .CustomErrorResponses.Items =
      (upsert_spa_error((.CustomErrorResponses.Items // []); 403) | upsert_spa_error(.; 404))
  | .CustomErrorResponses.Quantity = (.CustomErrorResponses.Items | length)
' "$current_json" > "$desired_json"

aws cloudfront update-distribution \
  --id "$distribution_id" \
  --if-match "$etag" \
  --distribution-config "file://$desired_json" \
  >/dev/null

aws cloudfront create-invalidation \
  --distribution-id "$distribution_id" \
  --paths "/*" \
  >/dev/null

echo "Configured CloudFront SPA fallback for distribution $distribution_id"
