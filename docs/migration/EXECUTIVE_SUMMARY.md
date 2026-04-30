# Custom Apps CLI Migration — Executive Summary

## TL;DR

The Custom Apps CLI (`domoapps-cli`, published as `ryuu`, installed as the `domo` command) is being absorbed into a new general-purpose Go CLI. Custom App functionality lives under a `domo app` noun in the new tool. This is a **rewrite from scratch in Go**, not a port — we're keeping behavior compatibility where it matters (manifest format, proxy URL contract) and intentionally dropping accumulated complexity that no longer earns its keep.

The full implementation plan lives in `~/dev/domo-go-cli/docs/apps-migration/IMPLEMENTATION_PLAN.md`.

---

## Why now

The other team is building a general Domo CLI in Go. The `domo` binary alias is shared. Rather than coexist as two separate tools, Custom Apps becomes a feature noun (`domo app`) in the unified tool. Users get one CLI for everything Domo, and we get to consolidate three Node packages (`ryuu`, `ryuu-client`, `ryuu-proxy`) into a single Go binary.

---

## What's in scope

Full feature parity for the Custom Apps lifecycle:

| Old (`ryuu`) | New (`domo app *`) |
|---|---|
| `domo init` | `domo app init` |
| `domo dev` | `domo app dev` |
| `domo publish` | `domo app publish` |
| `domo release` | `domo app release` |
| `domo download` | `domo app download` |
| `domo ls` | `domo app list` |
| `domo delete` | `domo app delete` |
| `domo undelete` | `domo app undelete` |
| `domo owner add/rm/ls` | `domo app owner add/remove/list` |
| `domo login` / `logout` / `token` | `domo auth login` (+ `--token` flag) |
| `domo proxy` | (Go CLI's existing equivalent) |

---

## What's intentionally NOT in scope

These are deliberate cuts, not oversights:

### 1. The React-based dev UI shell
`ryuu dev` today wraps the user's app in a React iframe with a canvas-size visualization, controls panel, and warning chrome. **Dropped.** The Go dev server serves the user's app at `localhost:3000` directly. Canvas-size visualization is deprecatable; it provided more visual noise than insight.

### 2. Vite, bundling, HMR, React Fast Refresh
Custom Apps are static HTML/CSS/JS with `<script src="...">` tags. There's no module graph, no transpilation, no JSX. Vite was always overkill for what apps actually look like. The Go dev server uses a plain static file server + file watcher + WebSocket-based full page reload. ~300 lines of Go vs. a Vite dependency tree.

### 3. Four of five starter templates
Today: `hello world`, `basic chart`, `map chart`, `sugarforce`, `manifest only`.
New: **one** refreshed `hello-world` template + an `--empty` flag.

The chart templates depended on a proprietary CDN-loaded chart library; `sugarforce` was a 20-file CRM demo more confusing than instructive. The new `hello-world` is a single, well-styled page that demonstrates the canonical pattern (script-tag `ryuu.js` + `domo.get('/data/v1/...')` + render to a table) — meant to double as living documentation.

### 4. Credential migration from `~/.ryuu/`
New users run `domo auth login`. We can ship a one-time migration helper later if support requests it; not blocking.

### 5. Separate `domo token add/remove` commands
Already covered by `domo auth login --token` in the new CLI. Single concept, single command.

### 6. Backwards-compatible flag names
The Go CLI uses idiomatic Go-style flags (`--instance`, kebab-case). We are publishing a migration map; we are **not** preserving every old flag spelling. This is the freedom we get from making Custom Apps into a `domo app` noun under a new top-level CLI.

---

## What stays compatible

The things existing app projects on disk depend on. **None of these change:**

- **`manifest.json` schema** — same fields, same migration behavior, same 2-space indent on write. Mixed-toolchain projects (some devs on `ryuu`, some on the new CLI) read and write the same file.
- **The `<script src="https://unpkg.com/ryuu.js">` pattern** — apps continue to use `domo.get/put/post/delete`. The Go proxy matches the existing URL contract exactly.
- **Proxy URL patterns** — `/data/v1/*`, `/sql/v1/*`, `/dql/v1/*`, `/api/*`, `/domo/*/v1` — locked to whatever `ryuu.js` calls today.
- **The `proxyId` lifecycle** — auto-create app instance on first `dev` run if `id` is present and `proxyId` is missing; persist back to manifest. Same as today.
- **`oAuthEnabled` device-flow OAuth** — supported in Phase 4 for the small subset of apps that use it. Same `client_id=domo:ryuu:{proxyId}` registration pattern, same scoped token format.

---

## Migration story for users

### CI/CD users (most enterprise customers)
Replace `ryuu` install + `domo publish` with the new Go binary install + `domo app publish`. Single binary, no `node_modules`, no Node runtime in the build agent. **Net positive.**

Available in **Phase 2**.

### Local development users
Two paths:

1. **Switch to the new CLI:** `domo app dev` runs a Go-native dev server with the same proxy contract. Lose the canvas-size chrome; gain a single binary and faster startup. No Node required even for development.
2. **Keep using `ryuu`:** The Node-based CLI continues to be published. We rename its binary `domo` → `ryuu` (npm package is already named `ryuu`) so it doesn't collide with the new tool. Users who want batteries-included development can stick with it indefinitely.

Available in **Phase 3**.

### `oAuthEnabled` apps
A minority of apps that explicitly opt into per-app OAuth scopes. These work in Phase 3 with degraded functionality (data APIs work via user session; AppDB/Files/Code Engine may not). Full support lands in **Phase 4**.

---

## Phasing & rough timeline

| Phase | Scope | Estimate |
|---|---|---|
| 1 | Manifest package + stateless commands (`list`, `get`, `delete`, `undelete`, `owner *`) | 1–2 weeks |
| 2 | Asset lifecycle (`init`, `download`, `publish`, `release`) | 1–2 weeks |
| 3 | `dev` server (static + proxy + reload + proxyId lifecycle) | 1–2 weeks |
| 4 | `oAuthEnabled` device-flow OAuth | 1 week |
| 5 | `publish-action` v2 (composite action wrapping the Go CLI) | 1 week, blocked on Phase 2 |

Phases 2 and 3 can run in parallel after Phase 1 lands. Phase 4 only matters if the platform team confirms non-trivial real-world `oAuthEnabled` usage. Phase 5 begins once Phase 2 ships `domo app publish` + `domo app release`.

---

## What happens to `domoapps/publish-action`

The GitHub Action that wraps `ryuu publish` for CI/CD also migrates — but on a separate, simpler track.

**Today (v1):** Node20 action, ships a built `dist/index.js`, runs `npm install -g ryuu` then shells out to `domo login` / `domo publish`.

**v2:** Composite action (pure shell, no runtime), downloads the Go CLI binary from GitHub Releases, runs `domo auth login` / `domo app publish` / optional `domo app release`. ~60 lines of bash total. No Node, no `dist/`, no `node_modules`.

**Compatibility:** all v1 input names preserved (`domo-token`, `domo-instance`, `build-command`, `working-directory`). Two new optional inputs (`cli-version`, `release-version`). The broken `app-url` output is fixed to point at the actual published design.

**Versioning:** `v1` tag stays alive for users still on `ryuu`. `v2` is the new Go-based version. Users opt in with a one-line `@v1` → `@v2` change. Both are maintained in parallel.

**Cold-start improvement:** ~40s faster per run (no `npm install -g ryuu`).

Plan: `~/dev/domoapps-publish-action/MIGRATION_PLAN.md`.

---

## What happens to `ryuu`

- Binary rename: `domo` → `ryuu`. Drops the alias before the Go CLI ships to prevent PATH-resolution footguns.
- README repositions it as the Node-friendly / batteries-included option.
- **No deprecation timeline.** It coexists with the Go CLI indefinitely. If usage drops to near-zero after Phase 3 lands, we revisit.
- Bug fixes continue. Major feature work moves to the Go CLI.

---

## Open questions

These need answers before / during Phase 1, in priority order:

1. **Multipart wire format** for `POST /api/designs/{id}/assets`. Need a captured network trace from `ryuu publish` or a check against the Java SDK.
2. **Owners payload field name** — `users` vs `emails`. Check Java SDK.
3. **Real-world `oAuthEnabled` usage** — how many production apps set this? Determines whether Phase 4 is urgent or backlog.
4. **Go CLI v1 timing** — does Custom Apps land in v1 or v1.x? Affects sequencing across both repos.
5. **TypeScript-side rename timing** — when do we publish `ryuu@x.y.z` with the binary rename? Should land before the Go CLI's first release that includes `domo app *`.

---

## Risks

- **Multipart upload format drift.** The least-documented piece of the wire contract. Mitigation: write the Phase 2 test against a captured fixture before implementing.
- **Proxy URL contract evolution.** If `ryuu.js` ships a new URL pattern after we lock the Go proxy, both tools have to update in sync. Mitigation: treat the URL pattern list as a versioned contract; coordinate changes with the `ryuu.js` maintainer.
- **`oAuthEnabled` complexity surfaced late.** The device-flow OAuth path is more involved than the per-command surveys suggested. Mitigation: scoped to its own phase, well-documented in the implementation plan, optional for apps that don't use it.

---

## Where to find more detail

- Go CLI implementation plan (package layout, endpoints, per-command behavior): `~/dev/domo-go-cli/docs/apps-migration/IMPLEMENTATION_PLAN.md`
- Publish action v2 migration plan: `~/dev/domoapps-publish-action/MIGRATION_PLAN.md`
- TypeScript source map (where each behavior is defined today): see §12 of the Go CLI implementation plan
- Existing TS code:
  - `~/dev/domoapps-cli` — `ryuu` CLI (this repo)
  - `~/dev/domoapps-client` — `ryuu-client` API client
  - `~/dev/ryuu-proxy` — `@domoinc/ryuu-proxy` dev proxy middleware
  - `~/dev/domoapps-publish-action` — the GitHub Action being migrated
