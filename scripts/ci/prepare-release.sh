#!/usr/bin/env bash
# Usage: prepare-release.sh <beta|rc|ga> <version> <from> <compare-version|-> <out-dir>
#
# Runs in a job with no credentials. Builds <from> as <version>, compares the packed tarball with
# <compare-version> from npm, makes the bot's version-only commit and tag locally, checks them with
# verify-tag.sh, and writes <out-dir>/release.bundle for push-release.sh. <from> is a master commit for a
# beta, or the tag of the stage below for an rc/ga.
#
#   beta:   an identical package means nothing shippable changed, so stop with ready=false.
#   rc/ga:  the package must be identical to the soaked beta/rc, or this fails.
#
# HOTFIX=true writes "(hotfix)" at the end of the tag annotation, which later runs read as a fast-track.
# Writes ready=true|false to <out-dir>/result (and to $GITHUB_OUTPUT). Run from a copy outside the checkout:
# this script checks out other trees.
set -euo pipefail

kind=${1:?kind} version=${2:?version} from=${3:?from} compare=${4:?compare} out=${5:?out-dir}
here=$(cd "$(dirname "$0")" && pwd)
summary=${GITHUB_STEP_SUMMARY:-/dev/null}
# Fully qualified: a tag named `origin/master` would otherwise shadow the remote-tracking branch.
master=refs/remotes/origin/master
bot_name='github-actions[bot]'
bot_email='41898282+github-actions[bot]@users.noreply.github.com'
note=
[ "${HOTFIX:-}" != true ] || note=' (hotfix)'

fail() { echo "::error::$1" >&2; exit 1; }
result() {
  mkdir -p "$out"
  echo "ready=$1" > "$out/result"
  [ -z "${GITHUB_OUTPUT:-}" ] || echo "ready=$1" >> "$GITHUB_OUTPUT"
}

case "$kind" in beta | rc | ga) ;; *) fail "kind must be beta, rc or ga, got $kind" ;; esac
[ "$kind" = beta ] || [ "$compare" != "-" ] || fail "$kind needs the soaked version to compare against"
if [ "$kind" = beta ]; then
  git merge-base --is-ancestor "$from" "$master" || fail "$from is not on master"
fi
if git rev-parse -q --verify "refs/tags/v$version" > /dev/null; then fail "tag v$version already exists"; fi

git checkout --quiet --detach "$from"
pnpm install --frozen-lockfile --ignore-scripts
npm version "$version" --no-git-tag-version --allow-same-version --ignore-scripts > /dev/null
if git diff --quiet -- package.json; then
  fail "package.json already says $version, so there is nothing to commit; set master's version to X.Y.Z-alpha.0 to raise the floor"
fi
pnpm test
pnpm run build

dirty=$(git status --porcelain -- . ':!package.json')
if [ -n "$dirty" ]; then
  echo "build left unexpected changes:" >&2
  echo "$dirty" >&2
  exit 1
fi

tarballs=$(mktemp -d)
built="$tarballs/$(npm pack --ignore-scripts --json --pack-destination "$tarballs" | node -pe 'JSON.parse(require("fs").readFileSync(0))[0].filename')"

if [ "$compare" != "-" ]; then
  previous="$tarballs/$(cd "$tarballs" && npm pack "ryuu@$compare" --json | node -pe 'JSON.parse(require("fs").readFileSync(0))[0].filename')"
  status=0
  "$here/same-artifact.sh" "$previous" "$built" || status=$?
  case $status in
    0) identical=true ;;
    1) identical=false ;;
    *) fail "could not compare the package with $compare" ;;
  esac
  if [ "$identical" = true ] && [ "$kind" = beta ]; then
    echo "No shippable change since $compare; not cutting $version."
    echo "No shippable change since \`$compare\`; skipped \`$version\`." >> "$summary"
    result false
    exit 0
  elif [ "$identical" = false ] && [ "$kind" != beta ]; then
    fail "$version does not match the soaked $compare package; refusing to release"
  fi
fi

git -c "user.name=$bot_name" -c "user.email=$bot_email" commit --quiet -m "chore(release): $version" -- package.json
git -c "user.name=$bot_name" -c "user.email=$bot_email" tag -a "v$version" -m "ryuu $version$note"

# The checks publish.yml will run, now, before anything is pushed.
"$here/verify-tag.sh" "v$version"

mkdir -p "$out"
git bundle create "$out/release.bundle" "refs/tags/v$version" "^$(git rev-parse HEAD^)"
result true
echo "Prepared v$version${note}." | tee -a "$summary"
