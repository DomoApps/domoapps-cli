#!/usr/bin/env bash
# Usage: verify-tag.sh <tag>   (run with the tag checked out, full history fetched)
#
# Checks that <tag> is a commit the release workflow made, and prints the publish plan as
# key=value lines (version, dist_tag, soaked, skip) for $GITHUB_OUTPUT.
set -euo pipefail

fail() { echo "::error::$1" >&2; exit 1; }

# Fully qualified: a tag named `origin/master` would otherwise shadow the remote-tracking branch.
master=refs/remotes/origin/master

# package.json at <commit> with its version field removed, as one JSON line. pnpm-lock.yaml records no version for
# the root package, so a release commit must not touch it at all (check_release_commit enforces that).
without_versions() {
  node -e '
    const { execFileSync } = require("child_process");
    const pkg = JSON.parse(
      execFileSync("git", ["show", `${process.argv[1]}:package.json`], { encoding: "utf8", maxBuffer: 1 << 30 }),
    );
    delete pkg.version;
    process.stdout.write(JSON.stringify(pkg));
  ' "$1"
}

version_at() {
  git show "$1:$2" | node -p 'JSON.parse(require("fs").readFileSync(0, "utf8")).version'
}

# Prints what `npm view` prints. A package, version or dist-tag that doesn't exist (E404 or empty
# output) yields nothing; any other failure fails the script rather than skipping the checks below.
npm_view() {
  local out err status
  err=$(mktemp)
  out=$(npm view "$@" --prefer-online 2>"$err") && status=0 || status=$?
  if [ "$status" -ne 0 ] && ! grep -q 'E404' "$err"; then
    cat "$err" >&2
    rm -f "$err"
    fail "npm view $* failed"
  fi
  rm -f "$err"
  [ "$status" -eq 0 ] && printf '%s' "$out"
  return 0
}

# A release commit is one bot-made commit on top of its parent that changes nothing but the version.
check_release_commit() {
  local commit=$1 expected=$2 label=$3 before after
  [ "$(git rev-list --parents -n1 "$commit" | wc -w)" -eq 2 ] || fail "$label: commit must have exactly one parent"
  [ "$(git log -1 --format=%ae "$commit")" = "$bot" ] || fail "$label: commit was not made by the release workflow"
  [ "$(git diff --name-only "$commit^" "$commit" | LC_ALL=C sort | tr '\n' ' ')" = "package.json " ] ||
    fail "$label: commit must change only package.json"
  before=$(without_versions "$commit^") || fail "$label: cannot read the package.json of its parent"
  after=$(without_versions "$commit") || fail "$label: cannot read its package.json"
  { [ -n "$before" ] && [ "$before" = "$after" ]; } ||
    fail "$label: commit changes more than the version in package.json"
  [ "$(version_at "$commit" package.json)" = "$expected" ] || fail "$label: package.json is not $expected"
}

# The version tagged on <commit>'s parent that matches <stage> (beta|rc) of this X.Y.Z, or empty.
tag_below() {
  local found
  found=$(git tag --points-at "$1^" | grep -E "^v${base//./\\.}-$2\.[0-9]+$" | head -1 || true)
  echo "${found#v}"
}

tag=$1
version=${tag#v}
base=${version%%-*}
bot='41898282+github-actions[bot]@users.noreply.github.com'

[ "$(git rev-parse HEAD)" = "$(git rev-parse "refs/tags/$tag^{commit}")" ] || fail "HEAD is not $tag"

# Each stage ships the tree of the stage below it, so every commit in the chain
# down to master must pass the same checks: GA → rc → beta → master.
if [[ $version =~ ^[0-9]+\.[0-9]+\.[0-9]+-beta\.[0-9]+$ ]]; then
  dist_tag=beta soaked=
  check_release_commit HEAD "$version" "$tag"
  git merge-base --is-ancestor HEAD^ "$master" || fail "$tag: parent is not on master"
elif [[ $version =~ ^[0-9]+\.[0-9]+\.[0-9]+-rc\.[0-9]+$ ]]; then
  dist_tag=rc
  soaked=$(tag_below HEAD beta)
  [ -n "$soaked" ] || fail "$tag: parent is not a v$base-beta.* tag"
  check_release_commit HEAD "$version" "$tag"
  check_release_commit HEAD^ "$soaked" "v$soaked"
  git merge-base --is-ancestor HEAD^^ "$master" || fail "v$soaked: parent is not on master"
elif [[ $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  dist_tag=latest
  soaked=$(tag_below HEAD rc)
  [ -n "$soaked" ] || fail "$tag: parent is not a v$base-rc.* tag"
  beta=$(tag_below HEAD^ beta)
  [ -n "$beta" ] || fail "v$soaked: parent is not a v$base-beta.* tag"
  check_release_commit HEAD "$version" "$tag"
  check_release_commit HEAD^ "$soaked" "v$soaked"
  check_release_commit HEAD^^ "$beta" "v$beta"
  git merge-base --is-ancestor HEAD^^^ "$master" || fail "v$beta: parent is not on master"
else
  fail "$tag is not a pipeline tag"
fi

skip=false
published=$(npm_view "ryuu@$version" version)
if [ -n "$published" ]; then
  echo "ryuu@$version is already on npm; nothing to publish." >&2
  skip=true
else
  current=$(npm_view ryuu "dist-tags.$dist_tag")
  # Never move a dist-tag backwards. Within an X.Y.Z, beta < rc < GA.
  node -e '
    const parse = (v) => {
      const m = /^(\d+)\.(\d+)\.(\d+)(?:-(beta|rc)\.(\d+))?$/.exec(v);
      return m && [m[1], m[2], m[3], { beta: 0, rc: 1 }[m[4]] ?? 2, m[5] ?? 0].map(Number);
    };
    const [next, current] = [parse(process.argv[1]), parse(process.argv[2])];
    const diff = current ? next.map((n, i) => n - current[i]).find((d) => d !== 0) ?? 0 : 1;
    if (diff <= 0) {
      console.error(`::error::${process.argv[1]} is not newer than ${process.argv[3]} (${process.argv[2]})`);
      process.exit(1);
    }
  ' "$version" "$current" "$dist_tag"
fi

echo "version=$version"
echo "dist_tag=$dist_tag"
echo "soaked=$soaked"
echo "skip=$skip"
