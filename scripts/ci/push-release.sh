#!/usr/bin/env bash
# Usage: push-release.sh <beta|rc|ga> <version> <release.bundle>
#
# Runs in the job that holds the deploy key and executes no repository code: it takes the tag that
# prepare-release.sh made from the bundle, verifies it again (an unprivileged job produced it), pushes it
# atomically (with release/vX.Y.Z for a GA) and dispatches publish.yml on the tag.
#
# REMOTE (default origin) is the remote to push to; DRY_RUN=true stops before pushing.
set -euo pipefail

kind=${1:?kind} version=${2:?version} bundle=${3:?bundle}
here=$(cd "$(dirname "$0")" && pwd)
remote=${REMOTE:-origin}
summary=${GITHUB_STEP_SUMMARY:-/dev/null}
tag="v$version"

fail() { echo "::error::$1" >&2; exit 1; }

case "$kind" in beta | rc | ga) ;; *) fail "kind must be beta, rc or ga, got $kind" ;; esac

# 0 when the remote has a ref matching $1, 1 when it has none; anything else is an error, not "absent".
remote_has() {
  local rc=0
  git ls-remote --exit-code "$remote" "$1" > /dev/null 2>&1 || rc=$?
  case $rc in
    0) return 0 ;;
    2) return 1 ;;
    *) fail "cannot read $remote (git ls-remote exited $rc)" ;;
  esac
}

if remote_has "refs/tags/$tag"; then fail "$tag already exists on $remote"; fi
if [ "$kind" = ga ] && remote_has "refs/heads/release/$tag"; then
  fail "release/$tag already exists on $remote; it must be deleted before this release can be pushed"
fi

git fetch --quiet "$bundle" "refs/tags/$tag:refs/tags/$tag"
git checkout --quiet --detach "refs/tags/$tag"
"$here/verify-tag.sh" "$tag"

refs=("refs/tags/$tag")
if [ "$kind" = ga ]; then refs+=("HEAD:refs/heads/release/$tag"); fi

if [ "${DRY_RUN:-}" = true ]; then
  echo "DRY_RUN: would push ${refs[*]} and dispatch publish.yml for $tag"
  echo "Dry run: would push \`${refs[*]}\` and publish \`$version\`." >> "$summary"
  exit 0
fi

if ! git push --atomic "$remote" "${refs[@]}"; then
  fail "the push to $remote was rejected, so nothing was pushed or published. Check that RELEASE_DEPLOY_KEY is set in the release environment, that its public key is a deploy key with write access, and that any tag or release-branch rulesets let deploy keys bypass them (RELEASING.md, One-time setup)"
fi
gh workflow run publish.yml --ref "refs/tags/$tag"
echo "Pushed \`${refs[*]}\` and dispatched publish for \`$version\`." | tee -a "$summary"
