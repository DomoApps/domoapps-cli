// CLI for the release workflow: gathers npm, git and Jira state, asks lib.ts what to
// do, and writes the decision to $GITHUB_OUTPUT. Usage: node release.js plan

import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { GitHubConfig, hasTrustedLabel } from './github';
import { checkAccess, bugJql, JiraConfig, search } from './jira';
import {
  Action,
  blockers,
  BugCheck,
  HOTFIX_LABEL,
  HOTFIX_ROLES,
  HotfixCheck,
  NON_BUG_RESOLUTIONS,
  parseTagRefs,
  planRelease,
  simulatedNow,
  State,
  TagInfo,
} from './lib';

const PACKAGE = 'ryuu';
// Fully qualified: a tag named `origin/master` would otherwise shadow the remote-tracking branch.
const MASTER = process.env.MASTER_REF || 'refs/remotes/origin/master';

/**
 * Runs a command and returns what it printed, with the whitespace at the ends trimmed. Anything the command
 * writes to its error output goes straight to the log, so a failure in git or npm is visible. It is the one
 * place this file talks to the command line.
 *
 * @param cmd - The program to run, such as `git`.
 * @param args - Its arguments as a list, so nothing is interpreted by a shell.
 * @returns The command's output as text.
 */
function sh(cmd: string, args: string[]): string {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
}

/**
 * Asks npm what has been published for ryuu: every version, when each one was published, and which version
 * each tag (`latest`, `rc`, `beta`) points to. The planner needs this to know what is already out and how long
 * each version has soaked. It is the only place the pipeline reads the npm registry.
 *
 * @returns The published versions, their publish times, and the dist-tags.
 */
function readNpm(): State['npm'] {
  const view = JSON.parse(sh('npm', ['view', PACKAGE, 'versions', 'time', 'dist-tags', '--json', '--prefer-online']));
  return { versions: view.versions, time: view.time, distTags: view['dist-tags'] };
}

/**
 * Reads the release tags from git and records, for each one, the commit it points at, that commit's parent, and
 * whether it is marked as a hotfix. The parent is how the planner checks that each stage was built directly on
 * top of the one before it, and prepare-release.sh writes the hotfix mark into the tag's annotation.
 *
 * @returns The tags keyed by version without the leading `v`; an empty object when there are none.
 */
function readTags(): Record<string, TagInfo> {
  const format = '%(refname:short)%09%(objecttype)%09%(objectname)%09%(*objectname)%09%(contents:subject)';
  const refs = parseTagRefs(sh('git', ['for-each-ref', 'refs/tags', `--format=${format}`]));
  if (!refs.length) return {};

  const parents = new Map(
    sh('git', ['log', '--no-walk=unsorted', '--format=%H %P', ...new Set(refs.map((r) => r.sha))])
      .split('\n')
      .map((line) => line.split(' ') as [string, string]),
  );
  return Object.fromEntries(
    refs.map((r) => [r.version, { sha: r.sha, parent: parents.get(r.sha) ?? '', hotfix: r.hotfix }]),
  );
}

/**
 * Builds the function the planner calls to ask "was master's latest commit a trusted hotfix?". It points at
 * this repository on GitHub and uses the workflow's token when there is one. Because every PR is squash-merged,
 * one commit means one PR, so only a single lookup is needed.
 *
 * @returns A function that takes a commit hash and answers true or false.
 */
function prHotfixCheck(): HotfixCheck {
  const cfg: GitHubConfig = {
    repo: process.env.GITHUB_REPOSITORY || 'DomoApps/domoapps-cli',
    token: process.env.GH_TOKEN || process.env.GITHUB_TOKEN,
    log: (message) => console.log(message),
  };
  return (sha) => hasTrustedLabel(cfg, sha, HOTFIX_LABEL, HOTFIX_ROLES);
}

/**
 * Builds the function the planner calls to ask "which Jira bugs are blocking these labels?". Jira's credentials
 * are only read the first time it is called, so runs that never reach a soak gate do not need them. It also
 * checks once that the account can see any bugs at all, so missing permissions cannot make a release look
 * bug-free.
 *
 * @returns A function that takes the labels and the soak start time and returns the blocking issue keys.
 */
function jiraBugCheck(): BugCheck {
  let cfg: JiraConfig | null = null;
  let access: Promise<void> | null = null;
  return async (labels, since) => {
    cfg ??= {
      baseUrl: required('JIRA_BASE_URL'),
      email: required('JIRA_EMAIL'),
      token: required('JIRA_API_TOKEN'),
      projects: required('JIRA_PROJECTS').split(',').map((p) => p.trim()).filter(Boolean),
    };
    access ??= checkAccess(cfg);
    await access;
    const issues = await search(cfg, bugJql(cfg.projects, labels));
    const found = blockers(issues, since, NON_BUG_RESOLUTIONS);
    console.log(`Jira: ${issues.length} bug(s) labelled ${labels.join(', ')}; blocking since ${since.toISOString()}: ${found.join(', ') || 'none'}`);
    return found;
  };
}

/**
 * Reads a setting from the environment and stops with a clear message if it is not set. It is used for the Jira
 * connection details, so a missing secret fails loudly instead of quietly skipping the bug check.
 *
 * @param name - The environment variable name, such as `JIRA_API_TOKEN`.
 * @returns The variable's value.
 * @throws If the variable is missing or empty.
 */
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing required env var ${name}`);
  return v;
}

/**
 * Shows the decision to whoever is watching: it prints it to the log, writes it as outputs the next workflow
 * jobs read, and adds a short summary to the run's page. Line breaks are removed from the values so one value
 * cannot sneak in an extra output. This is how the plan job hands its answer to the prepare and push jobs.
 *
 * @param s - The state the plan was based on, used for the summary line.
 * @param action - The decision to report.
 * @returns Nothing; it writes to the log and to GitHub's output and summary files.
 */
function report(s: State, action: Action): void {
  const fields: Record<string, string> = { action: action.kind, reason: action.reason };
  if ('version' in action) fields.version = action.version;
  if ('from' in action) fields.from = action.from;
  if ('compare' in action) fields.compare = action.compare ?? '';
  if ('hotfix' in action) fields.hotfix = String(action.hotfix);

  console.log(`plan: ${JSON.stringify(fields, null, 2)}`);
  if (process.env.GITHUB_OUTPUT) {
    // One line per value: a newline in any of them would inject extra outputs.
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      Object.entries(fields)
        .map(([k, v]) => `${k}=${v.replace(/[\r\n]+/g, ' ')}\n`)
        .join(''),
    );
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const tags = s.npm.distTags;
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `### Release plan: \`${action.kind}\` ${'version' in action ? `\`${action.version}\`` : ''}\n\n${action.reason}\n\n` +
        `latest \`${tags.latest ?? '-'}\` · rc \`${tags.rc ?? '-'}\` · beta \`${tags.beta ?? '-'}\` · ` +
        `master \`${s.masterSha.slice(0, 7)}\` (${s.masterVersion}) · now ${s.now.toISOString()}\n`,
    );
  }
}

/**
 * The entry point for the plan step of the Release workflow. It gathers the current state from git, npm and the
 * environment, asks the planner what to do, and reports the answer. The workflow's later jobs read that answer
 * to build, tag and publish, so this is where facts turn into a decision.
 *
 * @returns Resolves once the plan has been reported; any error rejects it, and the caller turns that into a
 *   failed run.
 * @throws If the command is not `plan`, or a simulated time is used outside a dry run.
 */
async function main(): Promise<void> {
  if (process.argv[2] !== 'plan') throw new Error('usage: release.js plan');

  const dryRun = process.env.DRY_RUN === 'true';
  const simulate = process.env.SIMULATE_NOW ?? '';
  if (simulate && !dryRun) throw new Error('simulate_now is only allowed with dry_run');

  const state: State = {
    now: simulatedNow(simulate, new Date()),
    masterVersion: JSON.parse(sh('git', ['show', `${MASTER}:package.json`])).version,
    masterSha: sh('git', ['rev-parse', `${MASTER}^{commit}`]),
    npm: readNpm(),
    tags: readTags(),
  };
  const action = await planRelease(
    state,
    jiraBugCheck(),
    { forceRc: process.env.FORCE_RC === 'true', forceGa: process.env.FORCE_GA === 'true' },
    prHotfixCheck(),
  );
  report(state, action);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
