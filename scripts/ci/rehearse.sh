#!/usr/bin/env bash
# Usage: npm run release:rehearse        (KEEP_SANDBOX=1 keeps the sandbox for inspection)
#
# Rehearses what happens when this checkout is merged, using the same scripts as the Release and Publish
# workflows: a dry run, a live run (plan -> prepare -> push), and the Publish checks for the tag it makes.
# Everything happens in a throwaway clone whose "origin" is a local bare repo, with a `gh` that only logs.
# Nothing is pushed to GitHub, and the npm step is `npm publish --dry-run` with an empty npm config, so your
# own npm login is never used. The plan reads the real npm registry; the GitHub label lookup finds nothing
# because the sandbox commits don't exist on GitHub, so a hotfix cannot be rehearsed here.
set -euo pipefail

src=$(git rev-parse --show-toplevel)
tmp=${TMPDIR:-/tmp}
w=$(mktemp -d "${tmp%/}/ryuu-rehearsal.XXXXXX")
if [ "${KEEP_SANDBOX:-}" != 1 ]; then trap 'rm -rf "$w"' EXIT; fi
step() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
kv() { grep "^$1=" "$2" | tail -1 | cut -d= -f2- || true; }

step "Sandbox: $w"
git clone -q --bare "$src" "$w/origin.git"
git clone -q "$w/origin.git" "$w/merge"
git -C "$w/merge" checkout -q -B master "$(git -C "$src" rev-parse HEAD)"

step "Simulate the merge: this checkout's HEAD plus uncommitted changes, as master"
(cd "$src" && {
  git -c core.quotePath=false diff --name-only --no-renames -z HEAD
  git -c core.quotePath=false ls-files -z --others --exclude-standard
} | sort -zu) > "$w/changed"
while IFS= read -r -d '' f; do
  if [ -e "$src/$f" ]; then
    mkdir -p "$w/merge/$(dirname "$f")" && cp -p "$src/$f" "$w/merge/$f"
  else
    git -C "$w/merge" rm -q --ignore-unmatch -- "$f"
  fi
done < "$w/changed"
git -C "$w/merge" add -A
git -C "$w/merge" -c user.name=rehearsal -c user.email=rehearsal@example.invalid commit -qm "rehearsal merge" --allow-empty
git -C "$w/merge" push -q -f origin HEAD:master

mkdir -p "$w/bin"
printf '#!/bin/sh\necho "gh $*" >> "%s/gh.log"\n' "$w" > "$w/bin/gh"
chmod +x "$w/bin/gh"
export PATH="$w/bin:$PATH"
: > "$w/empty.npmrc"

# Mirrors release.yml. $1 = dry_run (true|false)
release() {
  # plan job
  rm -rf "$w/runner" && git clone -q -b master "$w/origin.git" "$w/runner"
  cd "$w/runner"
  pnpm install --frozen-lockfile --ignore-scripts > "$w/npm-ci.log" 2>&1
  export RUNNER_TEMP="$w/runner-temp" && rm -rf "$RUNNER_TEMP" && mkdir -p "$RUNNER_TEMP/ci"
  pnpm exec tsc -p scripts/ci --outDir "$RUNNER_TEMP/ci"
  echo '{"type":"commonjs"}' > "$RUNNER_TEMP/ci/package.json"
  cp scripts/ci/*.sh "$RUNNER_TEMP/ci/"
  : > "$w/plan.out"
  DRY_RUN=$1 GITHUB_OUTPUT="$w/plan.out" node "$RUNNER_TEMP/ci/release.js" plan
  local action version compare
  action=$(kv action "$w/plan.out") version=$(kv version "$w/plan.out") compare=$(kv compare "$w/plan.out")

  case "$action" in
    publish)
      [ "$1" = true ] || gh workflow run publish.yml --ref "refs/tags/v$version"
      ;;
    beta | rc | ga)
      # prepare job: no credentials
      : > "$w/prepare.out"
      if ! HOTFIX=$(kv hotfix "$w/plan.out") GITHUB_OUTPUT="$w/prepare.out" \
        "$RUNNER_TEMP/ci/prepare-release.sh" "$action" "$version" "$(kv from "$w/plan.out")" "${compare:--}" "$w/out" \
        > "$w/prepare.log" 2>&1; then
        tail -20 "$w/prepare.log"
        return 1
      fi
      grep -E 'same-artifact|No shippable|Tests:|Prepared' "$w/prepare.log" || true
      # push job: a fresh clone, as the real job has; on a dry run it verifies and stops
      if [ "$(kv ready "$w/prepare.out")" = true ]; then
        rm -rf "$w/pusher" && git clone -q "$w/origin.git" "$w/pusher"
        (cd "$w/pusher" && DRY_RUN=$1 "$RUNNER_TEMP/ci/push-release.sh" "$action" "$version" "$w/out/release.bundle") |
          grep -E 'DRY_RUN|new tag|new branch|Pushed' || true
      fi
      ;;
  esac
  cd "$w"
}

# Mirrors publish.yml for one tag. $1 = tag
publish() {
  rm -rf "$w/pub" && git clone -q "$w/origin.git" "$w/pub"
  cd "$w/pub" && git checkout -q --detach "refs/tags/$1"
  scripts/ci/verify-tag.sh "$1" | tee "$w/verify.out"
  [ "$(kv skip "$w/verify.out")" = false ] || { cd "$w"; return 0; }
  local version dist_tag soaked
  version=$(kv version "$w/verify.out") dist_tag=$(kv dist_tag "$w/verify.out") soaked=$(kv soaked "$w/verify.out")
  pnpm install --frozen-lockfile --ignore-scripts > "$w/npm-ci.log" 2>&1
  { pnpm test && pnpm run build; } > "$w/build.log" 2>&1 || { tail -30 "$w/build.log"; return 1; }
  grep -E '^Tests:' "$w/build.log"
  npm pack --ignore-scripts > /dev/null 2>&1
  if [ "$dist_tag" != beta ]; then
    npm pack "ryuu@$soaked" --pack-destination "$w" > /dev/null
    scripts/ci/same-artifact.sh "$w/ryuu-$soaked.tgz" "ryuu-$version.tgz"
  fi
  NPM_CONFIG_USERCONFIG="$w/empty.npmrc" npm publish "./ryuu-$version.tgz" --tag "$dist_tag" --dry-run 2>&1 |
    grep -E 'Publishing to|^\+ ' || true
  cd "$w"
}

step "1. Release, dry run (the default when you click Run workflow)"
release true

step "2. Release, live (pushes to the local bare origin only)"
release false
if [ -s "$w/gh.log" ]; then
  git -C "$w/origin.git" tag -l "v$(kv version "$w/plan.out")" | sed 's/^/pushed tag: /'
  sed 's/^/dispatched: /' "$w/gh.log"

  step "3. Publish workflow for that tag (npm publish --dry-run)"
  publish "v$(kv version "$w/plan.out")"

  step "4. Release again: the tag is not on npm, so it should retry the publish"
  release true
else
  echo "Nothing to release: $(kv reason "$w/plan.out")"
fi

step "Done"
[ "${KEEP_SANDBOX:-}" != 1 ] || echo "Sandbox kept at $w"
