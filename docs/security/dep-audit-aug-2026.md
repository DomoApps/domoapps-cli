# Security Remediation Plan — domoapps-cli (ryuu) — August 2026

Audit date: 2026-08-12
Branch: `security/dep-audit-aug-2026`
Tooling: `pnpm audit`, GitHub Dependabot alerts

---

## Executive Summary

`domoapps-cli` is the end of the chain. It has two direct **production** dependencies with active
HIGH-severity CVEs: `vite` (dev server path traversal on Windows) and transitive `undici` via
`ryuu-client`. It also carries a significant number of dev tooling advisories (js-yaml, postcss,
brace-expansion, nanoid, babel/core) that are isolated to the test pipeline. The production fixes
are the priority — particularly `vite`, which is directly exposed to end-user dev environments.

---

## Vulnerabilities

### 1. `vite` — Direct production dependency — HIGH PRIORITY

Current version: `7.1.12` (spec: `^7.1.11`)
Required version: `>=7.3.5`

| Advisory | Severity | Summary | Fixed in |
|---|---|---|---|
| Dependabot #50 | HIGH | `server.fs.deny` bypass on Windows via alternate path formats (e.g. drive-letter casing, `//?/` prefix) — allows arbitrary file read via the dev server | 7.3.5 |
| Dependabot #49 | MEDIUM | `launch-editor` NTLMv2 hash disclosure — Windows UNC path triggers NTLM auth to attacker SMB server, leaking developer credentials | 7.3.5 |

**Impact on domoapps-cli:** `vite` is the dev server that `domo dev` runs. The `server.fs.deny`
bypass is directly in the request path — an attacker on the same network as a developer running
`domo dev` on Windows can read arbitrary files from the developer's machine. The NTLMv2 leak
similarly targets Windows developers and can result in credential compromise via offline cracking.

**Note:** These are Windows-specific. macOS/Linux developers are not affected by these particular
advisories, but the fix is a straightforward patch bump and should be applied regardless.

**Change required:**

```json
"vite": "^7.3.5"
```

**Compatibility check required:**

`@vitejs/plugin-react` (current: `^5.0.4`) must be compatible with vite 7.3.x. Check the
plugin-react changelog before bumping. As of this writing, plugin-react 5.x targets vite 7.x
broadly and patch bumps within 7.3.x should be safe.

The custom `src/server/vite-plugin-domo.ts` uses vite's internal APIs. The following APIs used
in that plugin need to be verified against vite 7.3.5 changelogs:
- `createServer()` config shape
- `ViteDevServer` type
- Middleware injection (`configureServer`)
- SSE (`res.setHeader` / `req.accepts`)

**Breaking change risk:** LOW. 7.1 → 7.3 within the same major; no breaking changes documented
in vite's changelog for this range. Recommend running `domo dev` end-to-end after upgrade.

---

### 2. `undici` — Transitive via `ryuu-client` — HIGH PRIORITY (production)

Current path: `domoapps-cli > ryuu-client@5.x > undici@7.24.7`
Required: ryuu-client pinned to a version that uses `undici>=7.29.0`

Full vulnerability list: identical to ryuu-client plan — TLS bypass, header injection, CRLF
injection, cross-user cache info disclosure, response desynchronization.

**Impact on domoapps-cli:** undici is in the authentication and API request path (login, publish,
design operations). The TLS bypass could allow MITM of API calls; the header injection vulns
could be triggered by a malicious Domo instance response.

**Change required:**

Once `ryuu-client@5.0.1` is published:

```json
"ryuu-client": "^5.0.1"
```

And once `@domoinc/ryuu-proxy@5.1.1` is published:

```json
"@domoinc/ryuu-proxy": "^5.1.1"
```

**Breaking change risk:** NONE. Pure transitive dep bump with no interface changes.

---

### 3. `js-yaml` — Transitive via `jest` — HIGH (dev only)

Current path: `jest > @jest/transform > babel-plugin-istanbul > @istanbuljs/load-nyc-config > js-yaml@3.14.1`
Required version: `>=3.15.1`

| Advisory | Severity | Summary | Fixed in |
|---|---|---|---|
| Dependabot #75/74 | HIGH | Quadratic CPU in `!!omap` resolution — CVE-2026-59870 | 3.15.1 / 4.3.1 |
| Dependabot #62/61 | HIGH | YAML merge-key chains force quadratic CPU | 3.15.0 / 4.3.0 |
| Dependabot #60/59 | MEDIUM | Quadratic-complexity DoS in merge key via repeated aliases | 3.15.0 / 4.2.0 |

**Impact:** Test pipeline only. Not shipped.

**Fix:** This is deeply nested in the jest chain and cannot be fixed by bumping jest directly
(jest pins its istanbul deps). Use a pnpm override:

```json
"pnpm": {
  "overrides": {
    "js-yaml": ">=3.15.1"
  }
}
```

**Breaking change risk for override:** LOW. js-yaml 3.x is stable; 3.14 → 3.15 has no
documented breaking changes.

---

### 4. `postcss` — Transitive via vite and jest — HIGH/MEDIUM (dev + build)

Path (dev server): `vite > postcss`
Path (tests): `jest > babel-jest > @babel/core > postcss` (if applicable)

| Advisory | Severity | Summary | Fixed in |
|---|---|---|---|
| Dependabot #67 | HIGH | Path traversal via sourceMappingURL — arbitrary .map file read | 8.5.18 |
| Dependabot #66 | HIGH | Arbitrary file read via sourceMappingURL in CSS comments | 8.5.12 |
| Dependabot #79 | MEDIUM | Incomplete fix — still reads .map files when `from` is unset | 8.5.23 |

**Impact:** Development tooling. Partially in the vite dev server path, so theoretically active
when `domo dev` is running — but requires attacker-controlled CSS input, which is unlikely in
the dev server context.

**Fix:** Upgrading vite to 7.3.5 resolves the vite-side postcss transitive. Add override for
any remaining paths:

```json
"pnpm": {
  "overrides": {
    "postcss": ">=8.5.23"
  }
}
```

---

### 5. `brace-expansion` — Transitive via `jest` — HIGH (dev only)

| Advisory | Severity | Summary | Fixed in |
|---|---|---|---|
| Dependabot #68 | HIGH | DoS via unbounded expansion length causing OOM | 2.1.3 |
| Dependabot #76 | HIGH | DoS via unbounded expansion (1.x range) | 1.1.17 |
| Dependabot #64 | HIGH | DoS via exponential-time expansion of `{}` groups | 1.1.16 |

**Fix:**

```json
"pnpm": {
  "overrides": {
    "brace-expansion@1": ">=1.1.17",
    "brace-expansion@2": ">=2.1.3"
  }
}
```

---

### 6. `nanoid` — Transitive via vite/postcss — HIGH (dev only)

| Advisory | Severity | Summary | Fixed in |
|---|---|---|---|
| Dependabot #78 | HIGH | Custom generators loop indefinitely when size is zero | 3.3.17 |
| Dependabot #77 | HIGH | Non-secure generators loop indefinitely with negative size | 3.3.16 |

**Fix:** Upgrading vite resolves this. Or add override:

```json
"pnpm": {
  "overrides": {
    "nanoid": ">=3.3.17"
  }
}
```

---

### 7. `@babel/core` — Transitive via `jest > babel-jest` — LOW (dev only)

| Advisory | Severity | Summary | Fixed in |
|---|---|---|---|
| Dependabot #58 | LOW | Arbitrary file read via `sourceMappingURL` comment | 7.29.6 |

**Impact:** Test pipeline only. Low severity, test-only.

**Fix:** Add override if needed after addressing higher-priority items:

```json
"pnpm": {
  "overrides": {
    "@babel/core": ">=7.29.6"
  }
}
```

---

## Implementation Plan

### Step 1: Upgrade `vite` — do this first, independently of sibling packages

```bash
pnpm update vite@^7.3.5
```

Verify `@vitejs/plugin-react` compatibility (check peer deps). Run:

```bash
npm run build
domo dev  # smoke test the dev server
```

Confirm the custom Vite plugin (`src/server/vite-plugin-domo.ts`) still compiles and functions.

### Step 2: Update sibling package deps (after they publish security patches)

After `ryuu-client@5.0.1` and `@domoinc/ryuu-proxy@5.1.1` are published:

```bash
pnpm update ryuu-client@^5.0.1 @domoinc/ryuu-proxy@^5.1.1
pnpm audit --audit-level=high
```

### Step 3: Add pnpm overrides for dev dep vulns

Add to `package.json`:

```json
"pnpm": {
  "overrides": {
    "js-yaml": ">=3.15.1",
    "postcss": ">=8.5.23",
    "brace-expansion@1": ">=1.1.17",
    "brace-expansion@2": ">=2.1.3",
    "nanoid": ">=3.3.17",
    "@babel/core": ">=7.29.6"
  }
}
```

Reinstall and verify:

```bash
pnpm install
pnpm audit
npm test
```

### Step 4: Full smoke test

```bash
npm run build
domo --version
domo dev  # verify dev server starts
npm test
```

---

## Downstream Effects

domoapps-cli is the end of the chain. No downstream packages depend on it.

The `vite` upgrade affects the dev server experience for CLI users, but introduces no API or
behavioral changes. Developers running `domo dev` on Windows get the security fix automatically
on their next `npm install -g ryuu` after publish.

---

## Version Bump After Fix

After all changes are verified:

```
5.1.0 → 5.1.1  (or fold into the post-release of v5.1.0 as the first patch)
```

Publish to npm with the `latest` tag.
