#!/usr/bin/env bash
set -euo pipefail

project_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$project_dir"

release=$(git rev-parse --short=12 HEAD)
[[ $release =~ ^[0-9a-f]{12}$ ]] || {
  echo "Unable to resolve a 12 character Git revision" >&2
  exit 1
}

export LDSP_PRIVATE_BUILD_METADATA=1
export CF_PAGES_COMMIT_SHA=$(git rev-parse HEAD)
unset VITE_APP_VERSION
export VITE_FARO_ENABLED=${VITE_FARO_ENABLED:-1}
export VITE_FARO_COLLECTOR_URL=${VITE_FARO_COLLECTOR_URL:-https://api1.ldspro.qzz.io/faro/collect}
export VITE_FARO_SESSION_SAMPLE_RATE=${VITE_FARO_SESSION_SAMPLE_RATE:-1}
export VITE_DEPLOYMENT_ENVIRONMENT=${VITE_DEPLOYMENT_ENVIRONMENT:-production}
faro_api_key=${VITE_FARO_API_KEY:-}
[[ ${#faro_api_key} -ge 16 ]] || {
  echo "VITE_FARO_API_KEY must be provided by the trusted build environment" >&2
  exit 1
}
export VITE_FARO_API_KEY=$faro_api_key
./node_modules/.bin/vite build
node scripts/verify-private-build.mjs

artifact_dir="$project_dir/.private-artifacts"
artifact="$artifact_dir/ldstore-web-$release.tar.gz"
mkdir -p "$artifact_dir"
(
  cd dist
  # macOS bsdtar otherwise serializes Finder/provenance xattrs. GNU tar can
  # materialize those as AppleDouble ._* files, which are not source maps.
  export COPYFILE_DISABLE=1
  find assets -type f -name '*.js.map' -print0 \
    | tar --no-xattrs --null -czf "$artifact" -T -
)
chmod 0600 "$artifact"

echo "Private build metadata packaged: release=$release artifact=$artifact"
