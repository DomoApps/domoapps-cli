// Pure release-decision logic for the ryuu pipeline. No I/O: release.ts gathers
// state from npm, git and Jira and hands it in. See RELEASING.md for the model.
//
// Stages: X.Y.Z-beta.N (npm `beta`) → X.Y.Z-rc.N (npm `rc`) → X.Y.Z (npm `latest`).

/** A line's first beta must be this old before it can become an rc... */
export const BETA_SOAK_DAYS = 7;
/** ...and its newest beta this old, so the latest change has soaked too... */
export const BETA_QUIET_DAYS = 3;
/** ...unless the first beta is this old, when the newest is promoted regardless, so steady merging can't starve a release. */
export const BETA_MAX_DAYS = 14;
export const RC_SOAK_DAYS = 7;
/** A run that lands within this long of a soak's end counts as ripe (cron jitter, publish latency). */
export const SOAK_GRACE_DAYS = 1 / 24;
/** A merged PR with this label sends its release straight to latest. */
export const HOTFIX_LABEL = 'release:hotfix';
/** Repository roles whose application of HOTFIX_LABEL counts. */
export const HOTFIX_ROLES = ['admin', 'maintain'];
export const NON_BUG_RESOLUTIONS = ['duplicate', "won't do", "won't fix", 'cannot reproduce', 'not a bug'];

const DAY_MS = 86_400_000;
const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)(?:-(beta|rc)\.(\d+))?$/;

export type Pre = 'beta' | 'rc';

export interface Parsed {
  base: string;
  major: number;
  minor: number;
  patch: number;
  pre: Pre | null;
  num: number | null;
}

export interface TagInfo {
  sha: string;
  parent: string;
  /** Set when the tag's annotation marks it as part of a hotfix release. */
  hotfix?: boolean;
}

export interface State {
  now: Date;
  masterVersion: string;
  masterSha: string;
  npm: {
    versions: string[];
    time: Record<string, string>;
    distTags: Record<string, string>;
  };
  /** Pipeline-format tags, keyed by version without the leading `v`. */
  tags: Record<string, TagInfo>;
}

export interface JiraIssue {
  key: string;
  created: string;
  statusCategory: string;
  resolution: string | null;
}

/** Returns the keys of bugs that block the given labels since `since`. Throws if Jira can't be read. */
export type BugCheck = (labels: string[], since: Date) => Promise<string[]>;

/** Whether master's commit `sha` came from a PR with a trustworthy HOTFIX_LABEL. */
export type HotfixCheck = (sha: string) => Promise<boolean>;

export type Action =
  | { kind: 'none'; reason: string }
  | { kind: 'publish'; version: string; reason: string }
  | { kind: 'beta'; version: string; from: string; compare: string | null; hotfix: boolean; reason: string }
  | { kind: 'rc'; version: string; from: string; compare: string; hotfix: boolean; reason: string }
  | { kind: 'ga'; version: string; from: string; compare: string; hotfix: boolean; reason: string };

export interface PlanOptions {
  forceRc?: boolean;
  forceGa?: boolean;
}

/**
 * Splits a version like `6.0.10-beta.2` into its parts: major, minor, patch, and the beta or rc stage and
 * number. Anything that is not a plain release, beta or rc, such as old alpha versions, comes back as null so
 * the rest of the pipeline ignores it. Every other function here relies on this as the single definition of a
 * valid pipeline version.
 *
 * @param v - The version text to read, without a leading `v`.
 * @returns The parsed parts, or null if the text is not a release, beta or rc version.
 */
export function parse(v: string): Parsed | null {
  const m = VERSION_RE.exec(v);
  if (!m) return null;
  return {
    base: `${m[1]}.${m[2]}.${m[3]}`,
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    pre: (m[4] as Pre | undefined) ?? null,
    num: m[5] === undefined ? null : Number(m[5]),
  };
}

export interface TagRef {
  version: string;
  sha: string;
  hotfix: boolean;
}

/**
 * Turns the text printed by `git for-each-ref refs/tags` into a list of release tags and notes which of them
 * are hotfixes. It skips any tag that is not named like a pipeline version, and only an annotated tag whose
 * message ends in "(hotfix)" counts as a hotfix. release.ts passes in the raw git output so this parsing can be
 * tested without running git.
 *
 * @param output - Raw git output, one tag per line, with tab-separated name, object type, object id, commit id
 *   the tag points at, and annotation subject (the format release.ts asks git for).
 * @returns One entry per pipeline-format tag: its version (no leading `v`), the commit it points at, and
 *   whether it is a hotfix.
 */
export function parseTagRefs(output: string): TagRef[] {
  return output
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split('\t'))
    .filter(([name]) => name.startsWith('v') && parse(name.slice(1)) !== null)
    .map(([name, type, obj, peeled, subject]) => ({
      version: name.slice(1),
      sha: peeled || obj,
      hotfix: type === 'tag' && /\(hotfix\)\s*$/.test(subject ?? ''),
    }));
}

/**
 * Pulls the plain `X.Y.Z` number off the front of any version text, even one the pipeline would never release,
 * like `6.0.9-alpha.0`. It is how master's package.json version is read as a "start at least here" floor. That
 * is how a person starts a new minor or major line without CI ever editing master.
 *
 * @param v - Any version text.
 * @returns The leading `X.Y.Z`, or null if the text does not start with one.
 */
export function baseOf(v: string): string | null {
  const m = /^(\d+\.\d+\.\d+)/.exec(v);
  return m ? m[1] : null;
}

/**
 * Compares two pipeline versions so they can be sorted oldest to newest, with a beta before an rc and an rc
 * before the final release of the same number. It is the one ordering rule the planner uses to find the newest
 * version, the highest release, and anything newer than what is already published.
 *
 * @param a - The first version.
 * @param b - The second version.
 * @returns A negative number if `a` is older than `b`, a positive number if it is newer, and 0 if they match.
 * @throws If either version is not a pipeline version.
 */
export function cmp(a: string, b: string): number {
  const pa = mustParse(a);
  const pb = mustParse(b);
  return (
    pa.major - pb.major ||
    pa.minor - pb.minor ||
    pa.patch - pb.patch ||
    rank(pa) - rank(pb) ||
    (pa.num ?? 0) - (pb.num ?? 0)
  );
}

/**
 * Works out what "now" should mean for a planning run: the real time normally, or a pretend time when someone
 * wants to see what would happen days from now. release.ts only allows the pretend time on dry runs, so the
 * soak timers can be rehearsed without waiting and without any risk.
 *
 * @param input - Empty for the real time, `+Nd` for N days after it (for example `+15d`), or an ISO date such
 *   as `2026-12-01T00:00:00Z`.
 * @param real - The actual current time, passed in so tests can control it.
 * @returns The time the plan should treat as now.
 * @throws If the input is neither empty, `+Nd`, nor an ISO date.
 */
export function simulatedNow(input: string, real: Date): Date {
  if (!input) return real;
  const offset = /^\+(\d+(?:\.\d+)?)d$/.exec(input);
  if (offset) return new Date(real.getTime() + Number(offset[1]) * DAY_MS);
  const at = new Date(input);
  if (/^\d{4}-\d{2}-\d{2}/.test(input) && !Number.isNaN(at.getTime())) return at;
  throw new Error(`simulate_now must be +Nd or an ISO timestamp, got "${input}"`);
}

/**
 * Decides which version number new merges are currently shipping as betas. It takes the highest of three
 * things: the patch after the newest rc or release, the minimum set in master's package.json, and any beta line
 * that is already published, so lowering master's version can never move the pipeline backwards. planRelease
 * treats the answer as the current line for every decision it makes.
 *
 * @param s - Everything known about npm, git tags and master (see the State type).
 * @returns The `X.Y.Z` the current line is working toward.
 * @throws If nothing has been released yet and master's package.json version has no usable number.
 */
export function activeBase(s: State): string {
  const all = known(s);
  const finished = all.filter((v) => mustParse(v).pre !== 'beta');
  const betas = all.filter((v) => mustParse(v).pre === 'beta').map((v) => mustParse(v).base);
  const next = finished.length ? nextPatch(finished[finished.length - 1]) : null;
  const floor = baseOf(s.masterVersion);
  const highestBeta = betas.length ? betas.sort(cmp)[betas.length - 1] : null;
  const candidates = [next, floor, highestBeta].filter((v): v is string => v !== null).sort(cmp);
  if (!candidates.length) throw new Error(`no released versions and no usable master version (${s.masterVersion})`);
  return candidates[candidates.length - 1];
}

/**
 * Works out the next beta or rc number for a version, such as the `3` in `6.0.10-beta.3`. It goes one past
 * every number it has ever seen in npm, in git tags and in master's own package.json version, because npm never
 * lets a version be reused even after it is unpublished. planRelease calls it whenever it is about to cut a new
 * beta or rc.
 *
 * @param base - The `X.Y.Z` the number is for.
 * @param pre - Which stage to number: `beta` or `rc`.
 * @param s - Everything known about npm, git tags and master (see the State type).
 * @returns The number to use next, starting at 0 when none has been used.
 */
export function nextNumber(base: string, pre: Pre, s: State): number {
  const seen = [...s.npm.versions, ...Object.keys(s.npm.time), ...Object.keys(s.tags), s.masterVersion]
    .map(parse)
    .filter((p): p is Parsed => p !== null && p.base === base && p.pre === pre)
    .map((p) => p.num as number);
  return seen.length ? Math.max(...seen) + 1 : 0;
}

/**
 * Finds a release tag that was created but never reached npm, for example because the publish step failed or
 * was cancelled. The release workflow retries that publish before doing anything else, so a stuck release
 * cannot be skipped over. It only looks at tags newer than the highest published release, which keeps old
 * leftovers from triggering retries.
 *
 * @param s - Everything known about npm, git tags and master (see the State type).
 * @returns The version of the oldest unpublished tag, or null if nothing is waiting.
 */
export function pendingPublish(s: State): string | null {
  // Compare with the highest published GA, not the highest version of any kind: while an rc soaks, the next
  // line's betas are already on npm, and a failed GA publish must still be retried.
  const publishedGa = newest(sorted(s.npm.versions).filter((v) => mustParse(v).pre === null));
  const pending = sorted(releaseTags(s)).filter(
    (v) => !(v in s.npm.time) && !s.npm.versions.includes(v) && (!publishedGa || cmp(v, publishedGa) > 0),
  );
  return pending[0] ?? null;
}

/**
 * The decision-maker for the release pipeline. From what is published, tagged and merged, it picks the single
 * next step in a fixed priority order (retry a publish, an admin override, a hotfix, release a soaked release
 * candidate, promote a soaked beta, or cut a beta) and explains why. release.ts calls it on every run and the
 * workflow carries out whatever it returns, so nothing in here touches the network itself.
 *
 * @param s - Everything known about npm, git tags and master (see the State type).
 * @param bugs - Looks up the Jira bugs blocking a set of labels; only called once a soak period has ended.
 * @param o - Admin overrides: `forceRc` promotes the newest beta now and `forceGa` releases the newest rc now.
 * @param isHotfix - Says whether master's latest commit came from a trusted `release:hotfix` PR; defaults to
 *   never.
 * @returns The action to take: what kind it is, the version to create, what to build it from and compare it
 *   against, whether it is a hotfix, and a plain-language reason.
 */
export async function planRelease(
  s: State,
  bugs: BugCheck,
  o: PlanOptions = {},
  isHotfix: HotfixCheck = async () => false,
): Promise<Action> {
  const pending = pendingPublish(s);
  if (pending) return { kind: 'publish', version: pending, reason: `v${pending} is tagged but not on npm` };

  const line = activeBase(s);
  const rcs = gaCandidates(s);
  const betas = stage(line, 'beta', s.npm.versions).filter((v) => s.tags[v]);
  const beta = newest(betas);
  const shippedSha = lastShippedMasterSha(line, s);
  const unreleased = shippedSha !== s.masterSha;

  /**
   * Builds the "promote the newest beta to a release candidate" action. The new version is numbered one past
   * any existing rc, built from the beta's tag and compared against that beta, and it inherits the beta's
   * hotfix flag. planRelease uses it from every place that can decide to promote.
   *
   * @param reason - Plain-language explanation shown in the run log.
   * @returns An `rc` action.
   */
  const toRc = (reason: string): Action => ({
    kind: 'rc',
    version: `${line}-rc.${nextNumber(line, 'rc', s)}`,
    from: `v${beta}`,
    compare: beta as string,
    hotfix: Boolean(beta && s.tags[beta].hotfix),
    reason,
  });
  /**
   * Builds the "cut a new beta from master's latest commit" action. It is numbered one past the betas already
   * used and compared against the line's newest beta, or the newest published release if the line has no beta
   * yet. planRelease uses it for both ordinary merges and hotfix merges.
   *
   * @param hotfix - Whether this beta is a hotfix, which makes the later steps skip their soaks.
   * @param reason - Plain-language explanation shown in the run log.
   * @returns A `beta` action.
   */
  const toBeta = (hotfix: boolean, reason: string): Action => ({
    kind: 'beta',
    version: `${line}-beta.${nextNumber(line, 'beta', s)}`,
    from: s.masterSha,
    compare: beta ?? newest(sorted(s.npm.versions).filter((v) => mustParse(v).pre !== 'beta')),
    hotfix,
    reason,
  });

  // Manual overrides
  if (o.forceGa) {
    return rcs.length
      ? ga(rcs[0], s, `force_ga: releasing ${rcs[0]}`)
      : { kind: 'none', reason: 'force_ga: no rc to release' };
  }
  if (o.forceRc) {
    return beta ? toRc(`force_rc: promoting ${beta}`) : { kind: 'none', reason: 'force_rc: no beta to promote' };
  }

  // Hotfixes. A lookup failure fails the run: cutting a normal beta would lose the hotfix for good.
  const hotRc = rcs.find((rc) => s.tags[rc].hotfix);
  if (hotRc) return ga(hotRc, s, `hotfix: releasing ${hotRc}`);
  if (beta && s.tags[beta].hotfix) return toRc(`hotfix: promoting ${beta}`);
  if (unreleased && (await isHotfix(s.masterSha))) {
    return toBeta(true, `master ${s.masterSha.slice(0, 7)} has unreleased commits from a ${HOTFIX_LABEL} PR`);
  }

  const notes: string[] = [];

  // rc → latest
  for (const rc of rcs) {
    const since = new Date(s.npm.time[rc]);
    const days = ageDays(s, since);
    if (!ripe(days, RC_SOAK_DAYS)) {
      notes.push(`${rc} has soaked ${days.toFixed(1)}/${RC_SOAK_DAYS} days`);
      continue;
    }
    const found = await bugs(labelsFor(mustParse(rc).base, s), since);
    if (!found.length) return ga(rc, s, `${rc} soaked ${days.toFixed(1)} days with no bugs`);
    notes.push(`${rc} blocked by ${found.join(', ')}`);
  }

  // beta → rc. The first-beta clock never restarts, and past BETA_MAX_DAYS the quiet period is waived,
  // so steady merging can't hold a line back forever.
  if (beta) {
    const since = new Date(s.npm.time[beta]);
    const firstDays = ageDays(s, new Date(s.npm.time[betas[0]]));
    const quietDays = ageDays(s, since);
    const eligible =
      ripe(firstDays, BETA_MAX_DAYS) || (ripe(firstDays, BETA_SOAK_DAYS) && ripe(quietDays, BETA_QUIET_DAYS));
    if (eligible) {
      const found = await bugs(labelsFor(line, s), since);
      if (!found.length) {
        return toRc(`${line} in beta ${firstDays.toFixed(1)} days, ${beta} quiet ${quietDays.toFixed(1)} days, no bugs`);
      }
      notes.push(`rc of ${line} blocked by ${found.join(', ')}`);
    } else {
      notes.push(
        `${line} in beta ${firstDays.toFixed(1)}/${BETA_SOAK_DAYS} days, ${beta} quiet ${quietDays.toFixed(1)}/${BETA_QUIET_DAYS} days`,
      );
    }
  }

  // master → beta
  if (!unreleased) {
    notes.push(`master ${s.masterSha.slice(0, 7)} is already released`);
    return { kind: 'none', reason: notes.join('; ') };
  }
  notes.push(`master ${s.masterSha.slice(0, 7)} has unreleased commits`);
  return toBeta(false, notes.join('; '));
}

/**
 * Picks out the Jira bugs that should stop a version from moving forward. A bug blocks if it is still open, or
 * if it was reported during the current soak and was not closed as something like "Duplicate" or "Won't Do". It
 * runs on issues that jira.ts has already fetched, which keeps the rules testable without a Jira connection.
 *
 * @param issues - The bugs labelled for the version, as read from Jira.
 * @param since - When the current soak started; bugs that are already done and were created before this do not
 *   count.
 * @param nonBugResolutions - Resolution names, in any capitalization, that mean "this was not a real bug".
 * @returns The issue keys, like `DOMO-123`, that block the release; an empty list means it is clear.
 */
export function blockers(issues: JiraIssue[], since: Date, nonBugResolutions: string[]): string[] {
  const ignored = new Set(nonBugResolutions.map(normalize));
  return issues
    .filter((i) => {
      if (i.statusCategory !== 'done') return true;
      if (new Date(i.created) < since) return false;
      return !(i.resolution && ignored.has(normalize(i.resolution)));
    })
    .map((i) => i.key);
}

/**
 * Lists the Jira labels that count as a bug against a version: `ryuu-X.Y.Z` plus one for each beta and rc of
 * it. Including the beta and rc labels means a bug still blocks the release if someone used the wrong suffix.
 * release.ts passes the result to the Jira search.
 *
 * @param base - The `X.Y.Z` to find bug labels for.
 * @param s - Everything known about npm, git tags and master (see the State type).
 * @returns The labels, with the plain version label first.
 */
export function labelsFor(base: string, s: State): string[] {
  const pres = sorted([...new Set([...s.npm.versions, ...Object.keys(s.tags)])]).filter((v) => {
    const p = mustParse(v);
    return p.base === base && p.pre !== null;
  });
  return [base, ...pres].map((v) => `ryuu-${v}`);
}

/**
 * Builds the "release this rc as latest" action. The final version is the rc's number without the `-rc.N` part,
 * built from the rc's tag and compared against that rc, and it inherits the rc's hotfix flag. planRelease uses
 * it from each place that can decide to release.
 *
 * @param rc - The release candidate being released, like `6.0.10-rc.0`.
 * @param s - Everything known about npm, git tags and master (see the State type).
 * @param reason - Plain-language explanation shown in the run log.
 * @returns A `ga` action.
 */
function ga(rc: string, s: State, reason: string): Action {
  return { kind: 'ga', version: mustParse(rc).base, from: `v${rc}`, compare: rc, hotfix: Boolean(s.tags[rc].hotfix), reason };
}

/**
 * Lists the release candidates that could be released as latest right now, highest first. It only includes the
 * newest rc of each version that is not released yet and is higher than anything already published, so rolling
 * `latest` back never brings an old rc back to life. planRelease walks this list when it decides whether a
 * release candidate has finished soaking.
 *
 * @param s - Everything known about npm, git tags and master (see the State type).
 * @returns The rc versions, newest first.
 */
function gaCandidates(s: State): string[] {
  // Never release at or below latest, nor below any GA already published, so rolling `latest` back
  // can't make a superseded rc eligible again.
  const latest = s.npm.distTags.latest;
  const publishedGa = newest(sorted(s.npm.versions).filter((v) => mustParse(v).pre === null));
  const floor =
    [latest && parse(latest) ? latest : null, publishedGa].filter((v): v is string => v !== null).sort(cmp).pop() ?? null;
  const released = new Set(known(s).filter((v) => mustParse(v).pre === null));
  const newestRc = new Map<string, string>();
  for (const v of sorted(s.npm.versions)) {
    const p = mustParse(v);
    if (p.pre === 'rc' && isPipelineRelease(v, s)) newestRc.set(p.base, v);
  }
  return [...newestRc.entries()]
    .filter(([b]) => !released.has(b) && (!floor || cmp(b, floor) > 0))
    .map(([, v]) => v)
    .sort(cmp)
    .reverse();
}

/**
 * Finds which commit on master was last turned into a release for a version line. Comparing it with master's
 * current commit tells planRelease whether there are changes still waiting to ship. If the line has no beta
 * yet, it falls back to the commit behind the newest rc.
 *
 * @param line - The `X.Y.Z` version line being checked.
 * @param s - Everything known about npm, git tags and master (see the State type).
 * @returns The commit hash, or null if nothing has shipped from master yet.
 */
function lastShippedMasterSha(line: string, s: State): string | null {
  const tagged = newest(stage(line, 'beta', Object.keys(s.tags)));
  if (tagged) return s.tags[tagged].parent;

  // No beta on this line yet: master was last shipped by the beta behind the newest rc.
  const rc = newest(releaseTags(s).filter((v) => mustParse(v).pre === 'rc'));
  return rc ? s.tags[parentTag(rc, s) as string].parent : null;
}

/**
 * Returns the git release tags that can be trusted: every beta tag, plus rc and release tags that really sit on
 * top of the right earlier stage. A tag made by hand that does not follow that chain is left out, so it cannot
 * change which version the pipeline works on or block a publish. It is the starting point for most tag
 * questions.
 *
 * @param s - Everything known about npm, git tags and master (see the State type).
 * @returns The trusted tag versions, without the leading `v`.
 */
function releaseTags(s: State): string[] {
  return Object.keys(s.tags).filter((v) => {
    const p = parse(v);
    return p !== null && (p.pre === 'beta' || isPipelineRelease(v, s));
  });
}

/**
 * Checks that a tag really came out of the pipeline by following the chain downward: a release candidate must
 * have been cut from a beta tag, and a final release from such a release candidate. This is how hand-made tags
 * are recognized and ignored.
 *
 * @param v - The rc or release version to check, without the leading `v`.
 * @param s - Everything known about npm, git tags and master (see the State type).
 * @returns True if the whole chain below the tag is intact.
 */
function isPipelineRelease(v: string, s: State): boolean {
  const parent = parentTag(v, s);
  if (!parent) return false;
  return mustParse(v).pre === 'rc' || isPipelineRelease(parent, s);
}

/**
 * Finds the earlier-stage tag that a release candidate or final release was built from, such as the beta behind
 * an rc. It matches by commit: the new tag's commit has to sit directly on top of the earlier tag's commit.
 * isPipelineRelease and lastShippedMasterSha use it to walk down the chain.
 *
 * @param v - An rc or release version, without the leading `v`.
 * @param s - Everything known about npm, git tags and master (see the State type).
 * @returns The earlier stage's version, or null for a beta, an unknown tag, or a tag with no match.
 */
function parentTag(v: string, s: State): string | null {
  const tag = s.tags[v];
  const p = parse(v);
  if (!tag || !p || p.pre === 'beta') return null;
  const below: Pre = p.pre === 'rc' ? 'beta' : 'rc';
  return stage(p.base, below, Object.keys(s.tags)).find((t) => s.tags[t].sha === tag.parent) ?? null;
}

/**
 * Collects every pipeline version known to exist, whether it is published on npm or tagged in git, sorted from
 * oldest to newest. Using both sources means a version that is tagged but not yet visible on npm still counts
 * when deciding what comes next. activeBase builds on it to find the newest finished version.
 *
 * @param s - Everything known about npm, git tags and master (see the State type).
 * @returns Sorted version strings with no duplicates.
 */
function known(s: State): string[] {
  return sorted([...new Set([...s.npm.versions, ...releaseTags(s)])]);
}

/**
 * Narrows a list of versions to one `X.Y.Z` and one stage, for example only the betas of 6.0.10, sorted oldest
 * to newest. It is the small helper planRelease uses to ask questions like "what are this line's betas?".
 *
 * @param base - The `X.Y.Z` to keep.
 * @param pre - The stage to keep: `beta` or `rc`.
 * @param from - Versions to filter; may contain duplicates and unrelated entries.
 * @returns The matching versions, de-duplicated and sorted.
 */
function stage(base: string, pre: Pre, from: string[]): string[] {
  return sorted(
    [...new Set(from)].filter((v) => {
      const p = parse(v);
      return p !== null && p.base === base && p.pre === pre;
    }),
  );
}

/**
 * Sorts versions from oldest to newest and drops any that are not pipeline versions, such as old alpha releases
 * on npm. That keeps legacy entries in npm's list from breaking comparisons everywhere else.
 *
 * @param versions - Version strings, in any order.
 * @returns A new sorted list containing only the valid versions.
 */
function sorted(versions: string[]): string[] {
  return versions.filter((v) => parse(v) !== null).sort(cmp);
}

/**
 * Returns the last item of an already-sorted list of versions, which is the newest one. Several parts of the
 * planner need "the latest of something", and this keeps that one-liner in one place.
 *
 * @param versions - Versions already sorted from oldest to newest.
 * @returns The newest version, or null for an empty list.
 */
function newest(versions: string[]): string | null {
  return versions.length ? versions[versions.length - 1] : null;
}

/**
 * Says whether a waiting period has finished. It allows a one-hour grace so a daily check that runs a few
 * minutes early still counts, which keeps release dates predictable. planRelease uses it for every soak timer.
 *
 * @param days - How many days have passed so far.
 * @param soak - How many days the wait needs to last.
 * @returns True once `days` is within the grace period of `soak`.
 */
function ripe(days: number, soak: number): boolean {
  return days + SOAK_GRACE_DAYS >= soak;
}

/**
 * Measures how many days have passed between a moment and "now" for this run. Using the run's own clock, rather
 * than the real one, is what lets a dry run pretend it is later. It feeds all the soak timers.
 *
 * @param s - The state, which holds the run's current time.
 * @param since - The earlier moment, usually when a version was published.
 * @returns The elapsed time in days, including fractions.
 */
function ageDays(s: State, since: Date): number {
  return (s.now.getTime() - since.getTime()) / DAY_MS;
}

/**
 * Gives each stage a number so versions with the same `X.Y.Z` sort in release order: beta first, then rc, then
 * the final release. cmp uses it to break ties after the major, minor and patch numbers.
 *
 * @param p - A parsed version.
 * @returns 0 for a beta, 1 for an rc, and 2 for a final release.
 */
function rank(p: Parsed): number {
  return p.pre === 'beta' ? 0 : p.pre === 'rc' ? 1 : 2;
}

/**
 * Adds one to the patch number of a version, turning 6.0.10 into 6.0.11. Once a release candidate is cut, new
 * merges start the next patch's betas, and activeBase uses this to find that number.
 *
 * @param v - Any pipeline version.
 * @returns The `X.Y.Z` of the next patch.
 */
function nextPatch(v: string): string {
  const p = mustParse(v);
  return `${p.major}.${p.minor}.${p.patch + 1}`;
}

/**
 * Does the same job as `parse`, but for versions that must be valid: it stops with an error instead of
 * returning null. It is used on versions the code has already filtered, so a failure points to a bug rather
 * than bad input.
 *
 * @param v - A version that should be a release, beta or rc.
 * @returns The parsed version.
 * @throws If the text is not a release, beta or rc version.
 */
function mustParse(v: string): Parsed {
  const p = parse(v);
  if (!p) throw new Error(`not a pipeline version: ${v}`);
  return p;
}

/**
 * Tidies a Jira resolution name so two spellings of the same word compare as equal: it trims spaces, lowercases
 * the text, and turns curly apostrophes into straight ones. blockers uses it to match resolutions against the
 * list of "not a real bug" names.
 *
 * @param resolution - A resolution name as Jira spells it.
 * @returns The tidied text.
 */
function normalize(resolution: string): string {
  return resolution.trim().toLowerCase().replace(/’/g, "'");
}
