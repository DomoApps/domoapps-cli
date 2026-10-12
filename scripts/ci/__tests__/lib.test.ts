import {
  activeBase,
  baseOf,
  blockers,
  BugCheck,
  HotfixCheck,
  cmp,
  JiraIssue,
  nextNumber,
  NON_BUG_RESOLUTIONS,
  parse,
  parseTagRefs,
  pendingPublish,
  planRelease,
  simulatedNow,
  State,
} from '../lib';

const DAY = 86_400_000;
const NOW = new Date('2026-10-09T15:23:00Z');
const ago = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();

// Mirrors the real registry on 2026-10-09: 6.0.9 is latest, the beta tag is stale,
// and a few historical versions don't match the pipeline's version format.
function base(): State {
  return {
    now: NOW,
    masterVersion: '6.0.9-alpha.0',
    masterSha: 'm1',
    npm: {
      versions: ['4.1.0-beta', '4.1.0-beta-1', '4.6.0-beta.0', '6.0.4-alpha.0', '6.0.8', '6.0.9'],
      time: { created: ago(900), modified: ago(1), '6.0.8': ago(63), '6.0.9': ago(56) },
      distTags: { latest: '6.0.9', beta: '4.6.0-beta.0', alpha: '6.0.4-alpha.0' },
    },
    tags: {},
  };
}

// 6.0.10 in beta: beta.0 built from master m1 `first` days ago, beta.1 from m2 `newest` days ago.
function inBeta(newest: number, first = newest + 3): State {
  const s = base();
  s.masterSha = 'm2';
  s.npm.versions.push('6.0.10-beta.0', '6.0.10-beta.1');
  s.npm.time['6.0.10-beta.0'] = ago(first);
  s.npm.time['6.0.10-beta.1'] = ago(newest);
  s.npm.distTags.beta = '6.0.10-beta.1';
  s.tags['6.0.10-beta.0'] = { sha: 'b0', parent: 'm1' };
  s.tags['6.0.10-beta.1'] = { sha: 'b1', parent: 'm2' };
  return s;
}

// beta.1 soaked and became 6.0.10-rc.0 `age` days ago.
function inRc(age: number): State {
  const s = inBeta(age + 4, age + 8);
  s.npm.versions.push('6.0.10-rc.0');
  s.npm.time['6.0.10-rc.0'] = ago(age);
  s.npm.distTags.rc = '6.0.10-rc.0';
  s.tags['6.0.10-rc.0'] = { sha: 'r0', parent: 'b1' };
  return s;
}

// rc.0 soaked and became 6.0.10 on latest `age` days ago.
function released(age: number): State {
  const s = inRc(age + 8);
  s.npm.versions.push('6.0.10');
  s.npm.time['6.0.10'] = ago(age);
  s.npm.distTags.latest = '6.0.10';
  s.tags['6.0.10'] = { sha: 'g0', parent: 'r0' };
  return s;
}

const noBugs: BugCheck = async () => [];
const LABELS_6_0_10 = ['ryuu-6.0.10', 'ryuu-6.0.10-beta.0', 'ryuu-6.0.10-beta.1'];

describe('parse', () => {
  it('parses GA, beta and rc versions', () => {
    expect(parse('6.0.10')).toEqual({ base: '6.0.10', major: 6, minor: 0, patch: 10, pre: null, num: null });
    expect(parse('6.0.10-beta.3')).toEqual({ base: '6.0.10', major: 6, minor: 0, patch: 10, pre: 'beta', num: 3 });
    expect(parse('6.0.10-rc.0')).toEqual({ base: '6.0.10', major: 6, minor: 0, patch: 10, pre: 'rc', num: 0 });
  });

  it('returns null for versions outside the pipeline format', () => {
    for (const v of ['4.1.0-beta', '4.1.0-beta-1', '6.0.4-alpha.0', 'v6.0.9', '6.0', '']) {
      expect(parse(v)).toBeNull();
    }
  });
});

describe('baseOf', () => {
  it('takes the X.Y.Z prefix of any prerelease', () => {
    expect(baseOf('6.0.9-alpha.0')).toBe('6.0.9');
    expect(baseOf('6.1.0-beta.0')).toBe('6.1.0');
    expect(baseOf('6.0.9')).toBe('6.0.9');
  });

  it('returns null when there is no X.Y.Z prefix', () => {
    expect(baseOf('latest')).toBeNull();
  });
});

describe('simulatedNow', () => {
  it('accepts an offset in days from the real clock', () => {
    expect(simulatedNow('+15d', NOW)).toEqual(new Date(NOW.getTime() + 15 * DAY));
  });

  it('accepts an ISO timestamp', () => {
    expect(simulatedNow('2026-11-01T00:00:00Z', NOW)).toEqual(new Date('2026-11-01T00:00:00Z'));
  });

  it('uses the real clock when unset', () => {
    expect(simulatedNow('', NOW)).toBe(NOW);
  });

  it('rejects anything else', () => {
    expect(() => simulatedNow('next week', NOW)).toThrow(/simulate_now/);
  });
});

describe('cmp', () => {
  it('orders beta < rc < GA within a version, numerically throughout', () => {
    const sorted = ['6.0.10', '6.0.9', '6.0.10-rc.0', '6.0.10-beta.10', '6.0.10-beta.2', '6.1.0-beta.0'].sort(cmp);
    expect(sorted).toEqual(['6.0.9', '6.0.10-beta.2', '6.0.10-beta.10', '6.0.10-rc.0', '6.0.10', '6.1.0-beta.0']);
  });
});

describe('activeBase', () => {
  it('is the next patch after the highest GA', () => {
    expect(activeBase(base())).toBe('6.0.10');
  });

  it('moves to the next patch as soon as a line reaches rc', () => {
    expect(activeBase(inRc(1))).toBe('6.0.11');
  });

  it('counts an rc tag that npm does not show yet', () => {
    const s = inBeta(20);
    s.tags['6.0.10-rc.0'] = { sha: 'r0', parent: 'b1' };
    expect(activeBase(s)).toBe('6.0.11');
  });

  it('ignores hand-made rc and GA tags that are not on the release chain', () => {
    const s = base();
    s.tags['6.0.10-rc.0'] = { sha: 'stray-rc', parent: 'm1' };
    s.tags['7.0.0'] = { sha: 'stray-ga', parent: 'm1' };
    expect(activeBase(s)).toBe('6.0.10');
  });

  it("stays on a published beta line when master's floor is lowered below it", () => {
    const s = base();
    s.npm.versions.push('6.1.0-beta.0');
    s.npm.time['6.1.0-beta.0'] = ago(1);
    s.masterVersion = '6.0.9-alpha.0';
    expect(activeBase(s)).toBe('6.1.0');
  });

  it('honours a higher floor from master package.json', () => {
    const s = base();
    s.masterVersion = '6.1.0-beta.0';
    expect(activeBase(s)).toBe('6.1.0');
  });
});

describe('nextNumber', () => {
  it("never reuses the version master's package.json already says", () => {
    const s = base();
    s.masterVersion = '6.1.0-beta.0';
    expect(nextNumber('6.1.0', 'beta', s)).toBe(1);
  });

  it('starts at 0', () => {
    expect(nextNumber('6.0.10', 'beta', base())).toBe(0);
    expect(nextNumber('6.0.10', 'rc', inBeta(1))).toBe(0);
  });

  it('skips numbers that exist only as unpublished npm time entries or git tags', () => {
    const s = inBeta(1);
    s.npm.time['6.0.10-beta.4'] = ago(2); // published then unpublished: npm never reuses it
    s.tags['6.0.10-beta.6'] = { sha: 'b6', parent: 'm9' };
    expect(nextNumber('6.0.10', 'beta', s)).toBe(7);
  });
});

describe('pendingPublish', () => {
  it('finds a pipeline tag newer than anything on npm', () => {
    const s = inBeta(1);
    s.tags['6.0.10-beta.2'] = { sha: 'b2', parent: 'm3' };
    expect(pendingPublish(s)).toBe('6.0.10-beta.2');
  });

  it('finds an rc tag that has not been published', () => {
    const s = inBeta(20);
    s.tags['6.0.10-rc.0'] = { sha: 'r0', parent: 'b1' };
    expect(pendingPublish(s)).toBe('6.0.10-rc.0');
  });

  it('still finds an unpublished GA when a newer line has already published betas', () => {
    const s = inRc(8);
    s.tags['6.0.10'] = { sha: 'g0', parent: 'r0' };
    s.npm.versions.push('6.0.11-beta.0');
    s.npm.time['6.0.11-beta.0'] = ago(1);
    s.tags['6.0.11-beta.0'] = { sha: 'b11', parent: 'm9' };
    expect(pendingPublish(s)).toBe('6.0.10');
  });

  it('ignores an unpublished beta tag below the highest published GA', () => {
    const s = base();
    s.tags['6.0.8-beta.3'] = { sha: 'old', parent: 'mx' };
    expect(pendingPublish(s)).toBeNull();
  });

  it('ignores tags already on npm and old orphaned tags', () => {
    const s = inBeta(1);
    s.tags['5.0.1'] = { sha: 'x', parent: 'y' };
    expect(pendingPublish(s)).toBeNull();
  });

  it('ignores a hand-made GA tag, which publish would reject forever', () => {
    const s = inBeta(1);
    s.tags['7.0.0'] = { sha: 'stray', parent: 'm2' };
    expect(pendingPublish(s)).toBeNull();
  });

  it('ignores a GA tag sitting on a hand-made rc that is not on a beta', () => {
    const s = base();
    s.tags['6.0.10-rc.0'] = { sha: 'stray-rc', parent: 'm1' };
    s.tags['6.0.10'] = { sha: 'stray-ga', parent: 'stray-rc' };
    expect(pendingPublish(s)).toBeNull();
    expect(activeBase(s)).toBe('6.0.10');
  });

  it('ignores a version npm has seen and unpublished, since it can never be republished', () => {
    const s = inBeta(1);
    s.tags['6.0.10-beta.2'] = { sha: 'b2', parent: 'm3' };
    s.npm.time['6.0.10-beta.2'] = ago(0);
    expect(pendingPublish(s)).toBeNull();
  });
});

describe('blockers', () => {
  const since = new Date(ago(10));
  const issue = (over: Partial<JiraIssue>): JiraIssue => ({
    key: 'DOMO-1',
    created: ago(5),
    statusCategory: 'done',
    resolution: 'Done',
    ...over,
  });

  it('blocks on any unresolved bug, however old', () => {
    expect(blockers([issue({ statusCategory: 'indeterminate', created: ago(40) })], since, NON_BUG_RESOLUTIONS)).toEqual([
      'DOMO-1',
    ]);
  });

  it('blocks on a bug reported during the soak even after it is fixed', () => {
    expect(blockers([issue({ resolution: 'Fixed' })], since, NON_BUG_RESOLUTIONS)).toEqual(['DOMO-1']);
  });

  it('blocks on a done bug with no resolution reported during the soak', () => {
    expect(blockers([issue({ resolution: null })], since, NON_BUG_RESOLUTIONS)).toEqual(['DOMO-1']);
  });

  it('ignores bugs closed as not-a-bug, case-insensitively', () => {
    const closed = ['Duplicate', "won't do", "Won't Fix", 'Cannot Reproduce', 'Not a Bug'].map((resolution, i) =>
      issue({ key: `DOMO-${i}`, resolution }),
    );
    expect(blockers(closed, since, NON_BUG_RESOLUTIONS)).toEqual([]);
  });

  it('ignores bugs fixed before the soak started', () => {
    expect(blockers([issue({ created: ago(12) })], since, NON_BUG_RESOLUTIONS)).toEqual([]);
  });
});

describe('planRelease: beta', () => {
  it('cuts 6.0.10-beta.0 on day 0, comparing against the last GA', async () => {
    expect(await planRelease(base(), noBugs)).toMatchObject({
      kind: 'beta',
      version: '6.0.10-beta.0',
      from: 'm1',
      compare: '6.0.9',
      hotfix: false,
    });
  });

  it('does nothing when master is already the newest beta', async () => {
    expect(await planRelease(inBeta(1), noBugs)).toMatchObject({ kind: 'none' });
  });

  it('cuts the next beta from new master commits, comparing against the newest beta', async () => {
    const s = inBeta(1);
    s.masterSha = 'm3';
    expect(await planRelease(s, noBugs)).toMatchObject({
      kind: 'beta',
      version: '6.0.10-beta.2',
      from: 'm3',
      compare: '6.0.10-beta.1',
    });
  });

  it('re-dispatches a pending publish before anything else', async () => {
    const s = inBeta(20);
    s.tags['6.0.10-rc.0'] = { sha: 'r0', parent: 'b1' };
    expect(await planRelease(s, noBugs)).toMatchObject({ kind: 'publish', version: '6.0.10-rc.0' });
  });

  it('abandons the in-flight line when master raises the floor', async () => {
    const s = inBeta(1);
    s.masterVersion = '6.1.0-beta.0';
    s.masterSha = 'm3';
    // master already says 6.1.0-beta.0, which a release commit could not change, so the line starts at beta.1
    expect(await planRelease(s, noBugs)).toMatchObject({ kind: 'beta', version: '6.1.0-beta.1', compare: '6.0.9' });
  });
});

describe('planRelease: beta → rc (first beta 7 days old, newest beta 3 days quiet)', () => {
  it('promotes once the first beta is 7 days old and the newest has been quiet 3 days', async () => {
    const bugs = jest.fn(noBugs);
    const s = inBeta(3, 7);
    expect(await planRelease(s, bugs)).toMatchObject({
      kind: 'rc',
      version: '6.0.10-rc.0',
      from: 'v6.0.10-beta.1',
      compare: '6.0.10-beta.1',
      hotfix: false,
    });
    expect(bugs).toHaveBeenCalledWith(LABELS_6_0_10, new Date(s.npm.time['6.0.10-beta.1']));
  });

  it('waits until the first beta of the line is 7 days old', async () => {
    const bugs = jest.fn(noBugs);
    expect(await planRelease(inBeta(4, 7 - 2 / 24), bugs)).toMatchObject({ kind: 'none' });
    expect(bugs).not.toHaveBeenCalled();
  });

  it('waits until the newest beta has been quiet for 3 days', async () => {
    const bugs = jest.fn(noBugs);
    expect(await planRelease(inBeta(3 - 2 / 24, 10), bugs)).toMatchObject({ kind: 'none' });
    expect(bugs).not.toHaveBeenCalled();
  });

  it('steady merging cannot hold a release forever: the first-beta clock never restarts', async () => {
    expect(await planRelease(inBeta(3, 60), noBugs)).toMatchObject({ kind: 'rc', version: '6.0.10-rc.0' });
  });

  it('promotes to rc even when master has moved on; new commits go to the next line', async () => {
    const s = inBeta(5, 9);
    s.masterSha = 'm3';
    expect(await planRelease(s, noBugs)).toMatchObject({ kind: 'rc', version: '6.0.10-rc.0' });
  });

  it('holds the rc while a bug blocks, and still cuts betas so a fix can ship', async () => {
    const s = inBeta(20);
    const bugs: BugCheck = async () => ['DOMO-7'];
    expect(await planRelease(s, bugs)).toMatchObject({ kind: 'none', reason: expect.stringContaining('DOMO-7') });
    s.masterSha = 'm3';
    expect(await planRelease(s, bugs)).toMatchObject({ kind: 'beta', version: '6.0.10-beta.2' });
  });

  it('fails instead of cutting a beta when Jira errors while the rc is due', async () => {
    const s = inBeta(20);
    s.masterSha = 'm3';
    const bugs: BugCheck = async () => {
      throw new Error('Jira returned 503');
    };
    await expect(planRelease(s, bugs)).rejects.toThrow('Jira returned 503');
  });

  it('force_rc skips the soak and the bug check', async () => {
    const bugs = jest.fn(noBugs);
    expect(await planRelease(inBeta(1), bugs, { forceRc: true })).toMatchObject({ kind: 'rc', version: '6.0.10-rc.0' });
    expect(bugs).not.toHaveBeenCalled();
  });

  it('force_rc with no beta to promote does nothing rather than cutting a beta', async () => {
    expect(await planRelease(base(), noBugs, { forceRc: true })).toMatchObject({
      kind: 'none',
      reason: expect.stringContaining('force_rc'),
    });
  });
});

describe('planRelease: after rc, the next line', () => {
  it('starts the next patch line from new master commits, comparing against the rc', async () => {
    const s = inRc(2);
    s.masterSha = 'm3';
    expect(await planRelease(s, noBugs)).toMatchObject({
      kind: 'beta',
      version: '6.0.11-beta.0',
      from: 'm3',
      compare: '6.0.10-rc.0',
    });
  });

  it('does nothing while master is still the commit that became the rc', async () => {
    expect(await planRelease(inRc(2), noBugs)).toMatchObject({ kind: 'none' });
  });
});

describe('planRelease: rc → latest after 7 days', () => {
  it('waits until the rc has soaked 7 days', async () => {
    const bugs = jest.fn(noBugs);
    expect(await planRelease(inRc(7 - 2 / 24), bugs)).toMatchObject({ kind: 'none' });
    expect(bugs).not.toHaveBeenCalled();
  });

  it('releases the rc as latest after 7 bug-free days', async () => {
    const bugs = jest.fn(noBugs);
    const s = inRc(7);
    expect(await planRelease(s, bugs)).toMatchObject({
      kind: 'ga',
      version: '6.0.10',
      from: 'v6.0.10-rc.0',
      compare: '6.0.10-rc.0',
      hotfix: false,
    });
    expect(bugs).toHaveBeenCalledWith([...LABELS_6_0_10, 'ryuu-6.0.10-rc.0'], new Date(s.npm.time['6.0.10-rc.0']));
  });

  it('holds the GA while a bug blocks, and the next line keeps shipping betas', async () => {
    const s = inRc(20);
    s.masterSha = 'm3';
    expect(await planRelease(s, async () => ['DOMO-9'])).toMatchObject({ kind: 'beta', version: '6.0.11-beta.0' });
  });

  it('fails instead of moving on when Jira errors while the GA is due', async () => {
    const s = inRc(20);
    s.masterSha = 'm3';
    await expect(
      planRelease(s, async () => {
        throw new Error('Jira returned 401');
      }),
    ).rejects.toThrow('Jira returned 401');
  });

  it('releases the highest ripe rc, skipping a newer one still soaking', async () => {
    const s = inRc(20);
    s.npm.versions.push('6.0.11-beta.0', '6.0.11-rc.0', '6.0.12-beta.0', '6.0.12-rc.0');
    s.npm.time['6.0.11-beta.0'] = ago(30);
    s.npm.time['6.0.11-rc.0'] = ago(8);
    s.npm.time['6.0.12-beta.0'] = ago(12);
    s.npm.time['6.0.12-rc.0'] = ago(2);
    s.tags['6.0.11-beta.0'] = { sha: 'b11', parent: 'm4' };
    s.tags['6.0.11-rc.0'] = { sha: 'r11', parent: 'b11' };
    s.tags['6.0.12-beta.0'] = { sha: 'b12', parent: 'm5' };
    s.tags['6.0.12-rc.0'] = { sha: 'r12', parent: 'b12' };
    s.masterSha = 'm5';
    expect(await planRelease(s, noBugs)).toMatchObject({ kind: 'ga', version: '6.0.11', from: 'v6.0.11-rc.0' });
  });

  it('never releases a version at or below latest', async () => {
    const s = inRc(20);
    s.npm.distTags.latest = '6.0.10';
    expect(await planRelease(s, noBugs)).toMatchObject({ kind: 'none' });
  });

  it('ignores an rc tag that is not on a beta tag', async () => {
    const s = inRc(20);
    s.tags['6.0.10-rc.0'] = { sha: 'r0', parent: 'm2' };
    expect(await planRelease(s, noBugs)).not.toMatchObject({ kind: 'ga' });
  });

  it('force_ga releases the newest rc now, skipping the soak and the bug check', async () => {
    const bugs = jest.fn(noBugs);
    expect(await planRelease(inRc(1), bugs, { forceGa: true })).toMatchObject({ kind: 'ga', version: '6.0.10' });
    expect(bugs).not.toHaveBeenCalled();
  });

  it('force_ga with no rc to release does nothing', async () => {
    expect(await planRelease(inBeta(1), noBugs, { forceGa: true })).toMatchObject({
      kind: 'none',
      reason: expect.stringContaining('force_ga'),
    });
  });

  it('after the GA, master unchanged means nothing to do', async () => {
    expect(await planRelease(released(2), noBugs)).toMatchObject({ kind: 'none' });
  });

  it('after the GA, new commits start 6.0.11', async () => {
    const s = released(2);
    s.masterSha = 'm3';
    expect(await planRelease(s, noBugs)).toMatchObject({ kind: 'beta', version: '6.0.11-beta.0', compare: '6.0.10' });
  });
});

describe('planRelease: the release:hotfix label', () => {
  const labelled: HotfixCheck = async () => true;

  it("marks the beta as a hotfix when master's latest merge carries the label", async () => {
    const isHotfix = jest.fn(labelled);
    const s = inBeta(1);
    s.masterSha = 'm3';
    expect(await planRelease(s, noBugs, {}, isHotfix)).toMatchObject({
      kind: 'beta',
      version: '6.0.10-beta.2',
      hotfix: true,
    });
    expect(isHotfix).toHaveBeenCalledWith('m3');
  });

  it("checks only master's latest commit, not the ones before it", async () => {
    const isHotfix = jest.fn(labelled);
    await planRelease(base(), noBugs, {}, isHotfix);
    expect(isHotfix).toHaveBeenCalledTimes(1);
    expect(isHotfix).toHaveBeenCalledWith('m1');
  });

  it("does not let an earlier hotfix PR speed up a later ordinary merge", async () => {
    // The labelled PR was a commit before master's tip; only the tip is looked at.
    const s = inBeta(1);
    s.masterSha = 'm4';
    const labelledOnlyM3: HotfixCheck = async (sha) => sha === 'm3';
    expect(await planRelease(s, noBugs, {}, labelledOnlyM3)).toMatchObject({ kind: 'beta', hotfix: false });
  });

  it('only looks up labels when master has unreleased commits', async () => {
    const isHotfix = jest.fn(labelled);
    await planRelease(inBeta(1), noBugs, {}, isHotfix);
    await planRelease(inBeta(3, 7), noBugs, {}, isHotfix);
    expect(isHotfix).not.toHaveBeenCalled();
    const s = inBeta(1);
    s.masterSha = 'm3';
    await planRelease(s, noBugs, {}, isHotfix);
    expect(isHotfix).toHaveBeenCalledTimes(1);
  });

  it('cuts a hotfix beta even when a normal promotion is ripe and Jira is down', async () => {
    const s = inRc(20); // 6.0.10-rc.0 has soaked well past 7 days
    s.masterSha = 'm3';
    const bugs: BugCheck = async () => {
      throw new Error('Jira returned 503');
    };
    expect(await planRelease(s, bugs, {}, labelled)).toMatchObject({
      kind: 'beta',
      version: '6.0.11-beta.0',
      hotfix: true,
    });
  });

  it('a hotfix beta takes priority over releasing a ripe, bug-free rc', async () => {
    const s = inRc(20);
    s.masterSha = 'm3';
    expect(await planRelease(s, noBugs, {}, labelled)).toMatchObject({ kind: 'beta', hotfix: true });
  });

  it('fails the run if the label lookup fails, rather than cutting a normal beta and losing the hotfix', async () => {
    const s = inBeta(1);
    s.masterSha = 'm3';
    const broken: HotfixCheck = async () => {
      throw new Error('GitHub 500');
    };
    await expect(planRelease(s, noBugs, {}, broken)).rejects.toThrow('GitHub 500');
  });

  it('continues a hotfix chain without consulting Jira, even if Jira is down', async () => {
    const s = inBeta(0, 0);
    s.tags['6.0.10-beta.1'].hotfix = true;
    const down: BugCheck = async () => {
      throw new Error('Jira returned 503');
    };
    expect(await planRelease(s, down)).toMatchObject({ kind: 'rc', hotfix: true });
  });

  it('promotes a hotfix beta to rc immediately, without the soak or the bug check', async () => {
    const bugs = jest.fn(noBugs);
    const s = inBeta(0, 0);
    s.tags['6.0.10-beta.1'].hotfix = true;
    expect(await planRelease(s, bugs)).toMatchObject({ kind: 'rc', version: '6.0.10-rc.0', hotfix: true });
    expect(bugs).not.toHaveBeenCalled();
  });

  it('follows only the newest beta: an older hotfix beta does not speed up a normal one', async () => {
    const s = inBeta(1);
    s.tags['6.0.10-beta.0'].hotfix = true;
    expect(await planRelease(s, noBugs)).toMatchObject({ kind: 'none' });
  });

  it('releases a hotfix rc to latest immediately, without the soak or the bug check', async () => {
    const bugs = jest.fn(noBugs);
    const s = inRc(0);
    s.tags['6.0.10-rc.0'].hotfix = true;
    expect(await planRelease(s, bugs)).toMatchObject({ kind: 'ga', version: '6.0.10', hotfix: true });
    expect(bugs).not.toHaveBeenCalled();
  });

  it('a hotfix rc supersedes a lower rc that is still soaking', async () => {
    const s = inRc(3);
    s.npm.versions.push('6.0.11-beta.0', '6.0.11-rc.0');
    s.npm.time['6.0.11-beta.0'] = ago(0);
    s.npm.time['6.0.11-rc.0'] = ago(0);
    s.tags['6.0.11-beta.0'] = { sha: 'b11', parent: 'm3', hotfix: true };
    s.tags['6.0.11-rc.0'] = { sha: 'r11', parent: 'b11', hotfix: true };
    s.masterSha = 'm3';
    expect(await planRelease(s, noBugs)).toMatchObject({ kind: 'ga', version: '6.0.11', hotfix: true });
  });
});

describe('planRelease: edge cases found in review', () => {
  it('does not re-release a superseded rc after a maintainer rolls latest back', async () => {
    const s = inRc(20);
    s.npm.versions.push('6.0.11-beta.0', '6.0.11-rc.0', '6.0.11');
    s.npm.time['6.0.11-beta.0'] = ago(10);
    s.npm.time['6.0.11-rc.0'] = ago(9);
    s.npm.time['6.0.11'] = ago(8);
    s.tags['6.0.11-beta.0'] = { sha: 'b11', parent: 'm3' };
    s.tags['6.0.11-rc.0'] = { sha: 'r11', parent: 'b11' };
    s.tags['6.0.11'] = { sha: 'g11', parent: 'r11' };
    s.npm.distTags.latest = '6.0.9'; // rolled back
    s.masterSha = 'm3';
    expect(await planRelease(s, noBugs)).not.toMatchObject({ kind: 'ga' });
  });

  it('force_rc promotes the newest beta even when an older rc is ripe for release', async () => {
    const s = inRc(20);
    s.npm.versions.push('6.0.11-beta.0');
    s.npm.time['6.0.11-beta.0'] = ago(1);
    s.tags['6.0.11-beta.0'] = { sha: 'b11', parent: 'm3' };
    s.masterSha = 'm3';
    expect(await planRelease(s, noBugs, { forceRc: true })).toMatchObject({ kind: 'rc', version: '6.0.11-rc.0' });
  });

  it('force_ga releases the highest rc, not the lowest', async () => {
    const s = inRc(20);
    s.npm.versions.push('6.0.11-beta.0', '6.0.11-rc.0');
    s.npm.time['6.0.11-beta.0'] = ago(3);
    s.npm.time['6.0.11-rc.0'] = ago(1);
    s.tags['6.0.11-beta.0'] = { sha: 'b11', parent: 'm3' };
    s.tags['6.0.11-rc.0'] = { sha: 'r11', parent: 'b11' };
    s.masterSha = 'm3';
    expect(await planRelease(s, noBugs, { forceGa: true })).toMatchObject({ kind: 'ga', version: '6.0.11' });
  });

  it('keeps going past a blocked rc to release an older ripe one', async () => {
    const s = inRc(20);
    s.npm.versions.push('6.0.11-beta.0', '6.0.11-rc.0');
    s.npm.time['6.0.11-beta.0'] = ago(30);
    s.npm.time['6.0.11-rc.0'] = ago(8);
    s.tags['6.0.11-beta.0'] = { sha: 'b11', parent: 'm3' };
    s.tags['6.0.11-rc.0'] = { sha: 'r11', parent: 'b11' };
    s.masterSha = 'm3';
    const bugs: BugCheck = async (labels) => (labels.includes('ryuu-6.0.11') ? ['DOMO-1'] : []);
    expect(await planRelease(s, bugs)).toMatchObject({ kind: 'ga', version: '6.0.10' });
  });

  it('a version stuck at the soak boundary is released by a cron run a few minutes early (grace)', async () => {
    expect(await planRelease(inRc(7 - 0.5 / 24), noBugs)).toMatchObject({ kind: 'ga', version: '6.0.10' });
    expect(await planRelease(inBeta(3 - 0.5 / 24, 7 - 0.5 / 24), noBugs)).toMatchObject({ kind: 'rc' });
  });
});

describe('planRelease: steady merging cannot starve a release', () => {
  // Merge every `every` days for `days` days with no bugs; the pipeline runs daily and chains hand-backs.
  async function simulate(every: number, days: number) {
    const s = base();
    s.masterSha = 'm0';
    s.npm.time['6.0.9'] = ago(60);
    const t0 = NOW.getTime();
    let merges = 0;
    const out = { rcs: 0, gas: 0 };
    for (let day = 0; day < days; day++) {
      s.now = new Date(t0 + day * DAY);
      if (day % every === 0) s.masterSha = `m${++merges}`;
      for (let step = 0; step < 4; step++) {
        const a = await planRelease(s, noBugs);
        if (a.kind !== 'beta' && a.kind !== 'rc' && a.kind !== 'ga') break;
        s.npm.versions.push(a.version);
        s.npm.time[a.version] = s.now.toISOString();
        s.tags[a.version] = { sha: `${a.kind}-${a.version}`, parent: a.kind === 'beta' ? a.from : s.tags[a.from.slice(1)].sha };
        if (a.kind === 'rc') out.rcs++;
        if (a.kind === 'ga') {
          out.gas++;
          s.npm.distTags.latest = a.version;
        }
      }
    }
    return out;
  }

  it.each([1, 2, 3, 7])('a package-changing merge every %i day(s) still reaches latest', async (every) => {
    const r = await simulate(every, 120);
    expect(r.rcs).toBeGreaterThan(3);
    expect(r.gas).toBeGreaterThan(3);
  });

  it('promotes once the first beta is 14 days old, however recently the newest beta was cut', async () => {
    expect(await planRelease(inBeta(0.5, 14), noBugs)).toMatchObject({ kind: 'rc', version: '6.0.10-rc.0' });
  });

  it('does not take the 14-day shortcut early', async () => {
    expect(await planRelease(inBeta(1, 13 - 2 / 24), noBugs)).toMatchObject({ kind: 'none' });
  });
});

describe('parseTagRefs', () => {
  const line = (...f: string[]) => f.join('\t');

  it('flags an annotated tag whose subject ends in (hotfix)', () => {
    const out = parseTagRefs(line('v6.0.10-beta.1', 'tag', 'tagobj', 'commit1', 'ryuu 6.0.10-beta.1 (hotfix)'));
    expect(out).toEqual([{ version: '6.0.10-beta.1', sha: 'commit1', hotfix: true }]);
  });

  it('does not flag a normal annotated tag or one that merely mentions hotfix', () => {
    const out = parseTagRefs(
      [
        line('v6.0.10-beta.0', 'tag', 't1', 'c1', 'ryuu 6.0.10-beta.0'),
        line('v6.0.10-beta.2', 'tag', 't2', 'c2', 'ryuu (hotfix) notes'),
      ].join('\n'),
    );
    expect(out.map((o) => o.hotfix)).toEqual([false, false]);
  });

  it('never flags a lightweight tag, whatever the commit subject says', () => {
    const out = parseTagRefs(line('v6.0.10-beta.3', 'commit', 'c3', '', 'fix thing (hotfix)'));
    expect(out).toEqual([{ version: '6.0.10-beta.3', sha: 'c3', hotfix: false }]);
  });

  it('ignores tags that are not pipeline-format versions', () => {
    const out = parseTagRefs(
      [line('latest', 'commit', 'c', '', 'x'), line('v1.0', 'commit', 'c', '', 'x'), line('origin/master', 'commit', 'c', '', 'x')].join('\n'),
    );
    expect(out).toEqual([]);
  });

  it('returns nothing for empty output', () => {
    expect(parseTagRefs('')).toEqual([]);
  });
});
