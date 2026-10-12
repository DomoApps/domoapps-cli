import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// The publish job runs no repository code (it holds the OIDC token), so its steps are inline shell in
// publish.yml. These tests pull a step's script out of the workflow and run it against a stub npm.
const WORKFLOW = readFileSync(path.resolve(__dirname, '../../../.github/workflows/publish.yml'), 'utf8').split('\n');

/** The `run: |` script of the step whose `- name:` line starts with `namePrefix`, de-indented. */
function stepScript(namePrefix: string): string {
  const start = WORKFLOW.findIndex((l) => l.trim().startsWith(`- name: ${namePrefix}`));
  if (start < 0) throw new Error(`no step named "${namePrefix}" in publish.yml`);
  const runAt = WORKFLOW.findIndex((l, i) => i > start && l.trim() === 'run: |');
  const keyIndent = WORKFLOW[runAt].search(/\S/);
  const body: string[] = [];
  for (const line of WORKFLOW.slice(runAt + 1)) {
    if (line.trim() !== '' && line.search(/\S/) <= keyIndent) break;
    body.push(line.slice(keyIndent + 2));
  }
  return body.join('\n');
}

// Pretends to be npm. `publish` behaves per NPM_PUBLISH; `view` prints the version once it has been asked
// NPM_VIEW_AFTER times, otherwise fails like a registry that does not list it yet.
const NPM = `#!/usr/bin/env bash
case "$1" in
  publish)
    case "$NPM_PUBLISH" in
      ok) echo "+ ryuu@$VERSION" ;;
      duplicate)
        echo "npm error code E403" >&2
        echo "npm error 403 403 Forbidden - PUT https://registry.npmjs.org/ryuu - You cannot publish over the previously published versions: $VERSION." >&2
        exit 1 ;;
      denied)
        echo "npm error code E404" >&2
        echo "npm error 404 Not Found - PUT https://registry.npmjs.org/ryuu - Not found" >&2
        exit 1 ;;
    esac ;;
  view)
    n=$(( $(cat "$NPM_COUNTER" 2>/dev/null || echo 0) + 1 )); echo "$n" > "$NPM_COUNTER"
    if [ "$n" -ge "\${NPM_VIEW_AFTER:-1}" ]; then echo "$VERSION"; exit 0; fi
    echo "npm error code E404" >&2; exit 1 ;;
esac
`;

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'publish-steps-'));
  writeFileSync(path.join(dir, 'npm'), NPM);
  chmodSync(path.join(dir, 'npm'), 0o755);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

// Capped at 20 seconds so a step that ignores the test's short waits fails the test instead of hanging it.
const exec = (script: string, env: Record<string, string>) => {
  const r = spawnSync('bash', ['-e', '-c', script], {
    cwd: dir,
    encoding: 'utf8',
    timeout: 20_000,
    env: {
      ...process.env,
      PATH: `${dir}:${process.env.PATH}`,
      VERSION: '6.0.10-beta.0',
      DIST_TAG: 'beta',
      NPM_COUNTER: path.join(dir, 'count'),
      ...env,
    },
  });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
};

const calls = () => Number(readFileSync(path.join(dir, 'count'), 'utf8').trim());

describe('publish.yml: the publish step', () => {
  const script = stepScript('Publish ryuu@');

  it('succeeds when npm accepts the package', () => {
    expect(exec(script, { NPM_PUBLISH: 'ok' }).status).toBe(0);
  });

  it('carries on when npm says the version already exists, since it may just be waiting to be listed', () => {
    const r = exec(script, { NPM_PUBLISH: 'duplicate' });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/previously published/);
    expect(r.stdout).toMatch(/already published or still being validated/);
  });

  it('still fails on any other error, and shows what npm said', () => {
    const r = exec(script, { NPM_PUBLISH: 'denied' });
    expect(r.status).not.toBe(0);
    expect(r.stdout + r.stderr).toMatch(/404 Not Found/);
  });
});

describe('publish.yml: the wait step', () => {
  const script = stepScript('Wait until the registry serves it');
  const fast = { WAIT_SECONDS: '0' };

  it('finishes as soon as the registry lists the version', () => {
    const r = exec(script, { ...fast, NPM_VIEW_AFTER: '3' });
    expect(r.status).toBe(0);
    expect(calls()).toBe(3);
  });

  it('gives up with a clear error if the version never appears', () => {
    const r = exec(script, { ...fast, WAIT_ATTEMPTS: '4', NPM_VIEW_AFTER: '999' });
    expect(r.status).not.toBe(0);
    expect(r.stderr + r.stdout).toMatch(/published but is not visible yet/);
    expect(calls()).toBe(4);
  });

  it('waits at least 20 minutes by default, because npm validates a new version for several minutes', () => {
    const attempts = Number(/WAIT_ATTEMPTS:-(\d+)/.exec(script)?.[1]);
    const seconds = Number(/WAIT_SECONDS:-(\d+)/.exec(script)?.[1]);
    expect(attempts * seconds).toBeGreaterThanOrEqual(20 * 60);
  });
});

describe('publish.yml: the publish job', () => {
  it('allows enough time for the longest wait', () => {
    const job = WORKFLOW.slice(WORKFLOW.findIndex((l) => l === '  publish:')).join('\n');
    const minutes = Number(/timeout-minutes:\s*(\d+)/.exec(job)?.[1]);
    expect(minutes).toBeGreaterThanOrEqual(25);
  });
});
