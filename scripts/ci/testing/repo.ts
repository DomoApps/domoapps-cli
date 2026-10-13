// Test helpers: throwaway git repos shaped like this project, with stub `npm` and `gh` on PATH.
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

export const SCRIPTS = path.resolve(__dirname, '..');
export const BOT = '41898282+github-actions[bot]@users.noreply.github.com';

// Pretends to be npm: `npm view ryuu@V version` and `npm view ryuu dist-tags.T`, driven by env vars.
const NPM_STUB = `#!/usr/bin/env bash
if [ -n "$NPM_STUB_FAIL" ]; then echo "npm error code ECONNREFUSED" >&2; exit 1; fi
[ "$1" = view ] || exit 0
case "$3" in
  version)
    v=\${2#ryuu@}
    for known in $NPM_STUB_VERSIONS; do [ "$known" = "$v" ] && echo "$v" && exit 0; done
    echo "npm error code E404" >&2; exit 1 ;;
  dist-tags.*)
    tag=\${3#dist-tags.}
    for pair in $NPM_STUB_DIST_TAGS; do [ "\${pair%%=*}" = "$tag" ] && echo "\${pair#*=}"; done
    exit 0 ;;
esac
`;

// Logs its arguments to $GH_LOG instead of talking to GitHub.
const GH_STUB = `#!/usr/bin/env bash
echo "gh $*" >> "\${GH_LOG:-/dev/null}"
`;

export interface Result {
  status: number | null;
  stdout: string;
  stderr: string;
  /** key=value lines of stdout */
  out: Record<string, string>;
}

export function run(file: string, args: string[], cwd: string, env: Record<string, string> = {}): Result {
  const r = spawnSync(file, args, { cwd, encoding: 'utf8', env: { ...process.env, ...env } });
  const out: Record<string, string> = {};
  for (const line of r.stdout.split('\n')) {
    const i = line.indexOf('=');
    if (i > 0) out[line.slice(0, i)] = line.slice(i + 1);
  }
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, out };
}

export class Repo {
  dir = mkdtempSync(path.join(tmpdir(), 'ci-repo-'));
  bin = path.join(this.dir, '.stub-bin');
  ghLog = path.join(this.dir, '.gh.log');

  constructor() {
    mkdirSync(this.bin);
    for (const [name, body] of [['npm', NPM_STUB], ['gh', GH_STUB]]) {
      writeFileSync(path.join(this.bin, name), body);
      chmodSync(path.join(this.bin, name), 0o755);
    }
    this.git('init', '-q', '-b', 'master');
    // A CI runner has no global git identity; commands that don't pass -c user.* must not depend on one.
    this.git('config', 'user.name', 'test');
    this.git('config', 'user.email', 'test@example.invalid');
    writeFileSync(path.join(this.dir, '.git', 'info', 'exclude'), '.stub-bin\n.gh.log\nremote.git\nclone\n');
    this.write('package.json', { name: 'ryuu', version: '5.1.4-alpha.0', scripts: { build: 'tsc' } });
    // pnpm-lock.yaml records no version for the root package, so a release commit never changes it.
    writeFileSync(path.join(this.dir, 'pnpm-lock.yaml'), "lockfileVersion: '9.0'\n");
    this.commit('master', 'human@example.com');
    this.git('update-ref', 'refs/remotes/origin/master', 'HEAD');
  }

  git(...args: string[]): string {
    return gitIn(this.dir, ...args);
  }

  read(file: string): any {
    return JSON.parse(readFileSync(path.join(this.dir, file), 'utf8'));
  }

  write(file: string, value: unknown) {
    writeFileSync(path.join(this.dir, file), JSON.stringify(value, null, 2) + '\n');
  }

  commit(message: string, email: string) {
    this.git('add', 'package.json', 'pnpm-lock.yaml');
    this.git('-c', 'user.name=x', '-c', `user.email=${email}`, 'commit', '-q', '--allow-empty', '-m', message);
  }

  /** A release commit and annotated tag on top of `from`, optionally also mutating the package files. */
  release(version: string, from: string, mutate: (pkg: any) => void = () => {}, email = BOT, note = ''): string {
    this.git('checkout', '-q', '--detach', from);
    const pkg = this.read('package.json');
    pkg.version = version;
    mutate(pkg);
    this.write('package.json', pkg);
    this.commit(`chore(release): ${version}`, email);
    this.git('-c', 'user.name=x', '-c', 'user.email=x@x', 'tag', '-a', `v${version}`, '-m', `ryuu ${version}${note}`);
    return this.git('rev-parse', 'HEAD');
  }

  /** Env that puts the stub npm and gh first on PATH. */
  env(extra: Record<string, string> = {}): Record<string, string> {
    return {
      PATH: `${this.bin}:${process.env.PATH}`,
      GH_LOG: this.ghLog,
      NPM_STUB_VERSIONS: '',
      NPM_STUB_DIST_TAGS: '',
      ...extra,
    };
  }

  ghCalls(): string[] {
    try {
      return readFileSync(this.ghLog, 'utf8').split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }

  destroy() {
    rmSync(this.dir, { recursive: true, force: true });
  }
}

export function gitIn(cwd: string, ...args: string[]): string {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}
