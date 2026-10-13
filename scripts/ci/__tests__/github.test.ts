import { GitHubConfig, hasTrustedLabel } from '../github';

const REPO = 'DomoApps/domoapps-cli';
const LABEL = 'release:hotfix';
const ROLES = ['admin', 'maintain'];
const MERGED = '2026-10-09T12:00:00Z';

interface Routes {
  pulls?: unknown;
  pullsStatus?: number;
  events?: Record<number, unknown[]>;
  eventsStatus?: number;
  roles?: Record<string, string>;
  permissionStatus?: number;
}

// Routes API paths to canned responses and records every request.
function fakeApi(r: Routes) {
  const calls: string[] = [];
  const headers: Array<Record<string, string>> = [];
  const fn = (async (url: string, init: RequestInit) => {
    const path = url.replace('https://api.github.com/repos/' + REPO, '');
    calls.push(path);
    headers.push((init?.headers ?? {}) as Record<string, string>);
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

    if (/^\/commits\/[^/]+\/pulls$/.test(path)) return json(r.pullsStatus ?? 200, r.pulls ?? []);

    const ev = /^\/issues\/(\d+)\/events\?per_page=100&page=(\d+)$/.exec(path);
    if (ev) {
      if (r.eventsStatus) return json(r.eventsStatus, { message: 'boom' });
      const all = r.events?.[Number(ev[1])] ?? [];
      const page = Number(ev[2]);
      return json(200, all.slice((page - 1) * 100, page * 100));
    }

    const perm = /^\/collaborators\/([^/]+)\/permission$/.exec(path);
    if (perm) {
      if (r.permissionStatus) return json(r.permissionStatus, { message: 'nope' });
      const role = r.roles?.[perm[1]];
      return role ? json(200, { role_name: role, permission: role === 'maintain' ? 'write' : role }) : json(404, {});
    }
    throw new Error(`unexpected request ${path}`);
  }) as unknown as typeof fetch;
  return { fn, calls, headers };
}

const cfg = (fn: typeof fetch, extra: Partial<GitHubConfig> = {}): GitHubConfig => ({ repo: REPO, fetchFn: fn, ...extra });
const pr = (number: number, labels: string[], merged: string | null = MERGED) => ({
  number,
  merged_at: merged,
  labels: labels.map((name) => ({ name })),
});
const labeled = (login: string, at: string, label = LABEL) => ({
  event: 'labeled',
  label: { name: label },
  actor: { login },
  created_at: at,
});

describe('hasTrustedLabel', () => {
  it('counts a PR whose label was applied before the merge by a maintainer', async () => {
    const api = fakeApi({
      pulls: [pr(101, [LABEL])],
      events: { 101: [labeled('alice', '2026-10-09T11:00:00Z')] },
      roles: { alice: 'maintain' },
    });
    expect(await hasTrustedLabel(cfg(api.fn), 'abc', LABEL, ROLES)).toBe(true);
  });

  it('counts an admin too', async () => {
    const api = fakeApi({
      pulls: [pr(101, [LABEL])],
      events: { 101: [labeled('boss', '2026-10-09T11:00:00Z')] },
      roles: { boss: 'admin' },
    });
    expect(await hasTrustedLabel(cfg(api.fn), 'abc', LABEL, ROLES)).toBe(true);
  });

  it('ignores a label applied by someone with only write access', async () => {
    const log = jest.fn();
    const api = fakeApi({
      pulls: [pr(101, [LABEL])],
      events: { 101: [labeled('mallory', '2026-10-09T11:00:00Z')] },
      roles: { mallory: 'write' },
    });
    expect(await hasTrustedLabel(cfg(api.fn, { log }), 'abc', LABEL, ROLES)).toBe(false);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('#101'));
  });

  it('ignores a label applied after the PR merged', async () => {
    const api = fakeApi({
      pulls: [pr(101, [LABEL])],
      events: { 101: [labeled('alice', '2026-10-09T12:00:01Z')] },
      roles: { alice: 'admin' },
    });
    expect(await hasTrustedLabel(cfg(api.fn), 'abc', LABEL, ROLES)).toBe(false);
  });

  it('ignores a label from an actor GitHub cannot resolve to a collaborator, such as a bot', async () => {
    const api = fakeApi({
      pulls: [pr(101, [LABEL])],
      events: { 101: [labeled('some-app[bot]', '2026-10-09T11:00:00Z')] },
      roles: {},
    });
    expect(await hasTrustedLabel(cfg(api.fn), 'abc', LABEL, ROLES)).toBe(false);
  });

  it('judges the most recent application: a writer re-applying the label after a maintainer does not count', async () => {
    const api = fakeApi({
      pulls: [pr(101, [LABEL])],
      events: { 101: [labeled('alice', '2026-10-09T10:00:00Z'), labeled('mallory', '2026-10-09T11:00:00Z')] },
      roles: { alice: 'admin', mallory: 'write' },
    });
    expect(await hasTrustedLabel(cfg(api.fn), 'abc', LABEL, ROLES)).toBe(false);
  });

  it('judges the most recent application: a maintainer re-applying it after a writer does count', async () => {
    const api = fakeApi({
      pulls: [pr(101, [LABEL])],
      events: { 101: [labeled('mallory', '2026-10-09T10:00:00Z'), labeled('alice', '2026-10-09T11:00:00Z')] },
      roles: { alice: 'admin', mallory: 'write' },
    });
    expect(await hasTrustedLabel(cfg(api.fn), 'abc', LABEL, ROLES)).toBe(true);
  });

  it('finds the labeled event on a later page of a busy PR', async () => {
    const noise = Array.from({ length: 100 }, () => ({ event: 'commented', created_at: '2026-10-09T09:00:00Z' }));
    const api = fakeApi({
      pulls: [pr(101, [LABEL])],
      events: { 101: [...noise, labeled('alice', '2026-10-09T11:00:00Z')] },
      roles: { alice: 'maintain' },
    });
    expect(await hasTrustedLabel(cfg(api.fn), 'abc', LABEL, ROLES)).toBe(true);
  });

  it('does not look at events for PRs without the label, unmerged PRs, or other labels', async () => {
    const api = fakeApi({
      pulls: [pr(101, ['bug']), pr(102, [LABEL], null), pr(103, ['dependencies'])],
    });
    expect(await hasTrustedLabel(cfg(api.fn), 'abc', LABEL, ROLES)).toBe(false);
    expect(api.calls.filter((c) => c.startsWith('/issues'))).toEqual([]);
  });

  it("is true when any one of the commit's PRs is trusted", async () => {
    const api = fakeApi({
      pulls: [pr(101, [LABEL]), pr(102, [LABEL])],
      events: { 101: [labeled('mallory', '2026-10-09T11:00:00Z')], 102: [labeled('alice', '2026-10-09T11:00:00Z')] },
      roles: { mallory: 'write', alice: 'maintain' },
    });
    expect(await hasTrustedLabel(cfg(api.fn), 'abc', LABEL, ROLES)).toBe(true);
  });

  it('sends the token when there is one, and works without it', async () => {
    const withToken = fakeApi({});
    await hasTrustedLabel(cfg(withToken.fn, { token: 't0ken' }), 'abc', LABEL, ROLES);
    expect(withToken.headers[0].Authorization).toBe('Bearer t0ken');
    const anon = fakeApi({});
    await hasTrustedLabel(cfg(anon.fn), 'abc', LABEL, ROLES);
    expect(anon.headers[0].Authorization).toBeUndefined();
  });

  it('treats a commit GitHub has never seen (e.g. unpushed, in a local rehearsal) as having no PR', async () => {
    expect(await hasTrustedLabel(cfg(fakeApi({ pullsStatus: 422, pulls: {} }).fn), 'abc', LABEL, ROLES)).toBe(false);
  });

  it('throws when the pull request lookup fails, instead of treating the merge as a normal one', async () => {
    await expect(
      hasTrustedLabel(cfg(fakeApi({ pullsStatus: 403, pulls: { message: 'rate limited' } }).fn), 'abc', LABEL, ROLES),
    ).rejects.toThrow(/GitHub pull request lookup failed: 403/);
  });

  it('throws when the events lookup fails', async () => {
    const api = fakeApi({ pulls: [pr(101, [LABEL])], eventsStatus: 500 });
    await expect(hasTrustedLabel(cfg(api.fn), 'abc', LABEL, ROLES)).rejects.toThrow(/GitHub event lookup failed: 500/);
  });

  it('throws when the permission lookup fails for a reason other than the actor not being a collaborator', async () => {
    const api = fakeApi({
      pulls: [pr(101, [LABEL])],
      events: { 101: [labeled('alice', '2026-10-09T11:00:00Z')] },
      permissionStatus: 500,
    });
    await expect(hasTrustedLabel(cfg(api.fn), 'abc', LABEL, ROLES)).rejects.toThrow(/GitHub permission lookup failed: 500/);
  });
});
