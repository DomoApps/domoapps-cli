// Decides whether a merged PR carries a trustworthy `release:hotfix` label. A hotfix skips both soaks and
// the Jira check, so the label only counts if a maintainer or admin applied it before the PR merged.

export interface GitHubConfig {
  repo: string;
  token?: string;
  fetchFn?: typeof fetch;
  /** Called with a one-line reason whenever a labelled PR is ignored. */
  log?: (message: string) => void;
}

interface PullRequest {
  number: number;
  merged_at: string | null;
  labels: Array<{ name: string }>;
}

interface IssueEvent {
  event: string;
  created_at: string;
  label?: { name: string };
  actor?: { login: string } | null;
}

const MAX_EVENT_PAGES = 10;

/**
 * Sends a GET request to GitHub's REST API for this repository, adding the standard headers and the access
 * token when there is one. Every GitHub lookup in this file goes through it, which keeps the base address and
 * sign-in in one place and lets tests supply a fake `fetch`.
 *
 * @param cfg - The repository name, an optional access token, an optional replacement `fetch` for tests, and an
 *   optional logger for rejected labels.
 * @param path - Everything after `/repos/{repo}`, such as `/commits/abc/pulls`.
 * @returns The raw response; the caller checks the status.
 */
async function get(cfg: GitHubConfig, path: string): Promise<Response> {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {}),
  };
  return (cfg.fetchFn ?? fetch)(`https://api.github.com/repos/${cfg.repo}${path}`, { headers });
}

/**
 * Answers one question for the release planner: did the commit being released come from a merged PR that
 * carries the hotfix label, applied by someone trusted before the merge? It finds the PRs behind the commit,
 * keeps the merged ones with the label, and verifies each. Because every PR is squash-merged, that is normally
 * exactly one PR.
 *
 * @param cfg - The repository name, an optional access token, an optional replacement `fetch` for tests, and an
 *   optional logger for rejected labels.
 * @param sha - The commit on master to check, normally master's latest commit.
 * @param label - The label to look for, such as `release:hotfix`.
 * @param roles - Repository roles allowed to apply the label, such as `admin` and `maintain`.
 * @returns True if at least one of the commit's PRs passes verification; false if none do, or if GitHub does
 *   not know the commit.
 * @throws If GitHub answers with an unexpected error, so a failed lookup is never mistaken for "no label".
 */
export async function hasTrustedLabel(cfg: GitHubConfig, sha: string, label: string, roles: string[]): Promise<boolean> {
  const response = await get(cfg, `/commits/${sha}/pulls`);

  // 422 means GitHub has never seen the commit (e.g. a local rehearsal), so no PR introduced it.
  if (response.status === 422) return false;
  if (!response.ok) throw new Error(`GitHub pull request lookup failed: ${response.status} ${await response.text()}`);

  const prs = (await response.json()) as PullRequest[];
  const labelled = prs.filter((p) => p.merged_at && p.labels.some((l) => l.name === label));
  const verified = await Promise.all(labelled.map((p) => verifyLabel(cfg, p, label, roles)));
  return verified.some(Boolean);
}

/**
 * Checks that the hotfix label on one PR can be trusted. It looks up who applied the label most recently and
 * when, then confirms they added it before the PR merged and hold an allowed role. When it rejects a label it
 * logs the reason, so people can see why a hotfix was treated as a normal change.
 *
 * @param cfg - The repository name, an optional access token, an optional replacement `fetch` for tests, and an
 *   optional logger for rejected labels.
 * @param p - The merged PR that currently has the label.
 * @param label - The label being verified.
 * @param roles - Repository roles allowed to apply the label.
 * @returns True if the label counts as a real hotfix request.
 * @throws If GitHub fails to answer the event or permission lookups.
 */
async function verifyLabel(cfg: GitHubConfig, p: PullRequest, label: string, roles: string[]): Promise<boolean> {
  /**
   * Records why a label was rejected and answers "not trusted". Having one place to do both keeps every
   * rejection logged the same way.
   *
   * @param why - A short reason, shown in the run log.
   * @returns Always false.
   */
  const ignore = (why: string) => {
    cfg.log?.(`PR #${p.number} has ${label} but it is ignored: ${why}`);
    return false;
  };

  const applied = lastApplication(await events(cfg, p.number), label);
  if (!applied) return ignore('no record of who applied it');
  if (new Date(applied.created_at) > new Date(p.merged_at as string)) return ignore('applied after the PR merged');

  const login = applied.actor?.login;
  if (!login) return ignore('the user who applied it is unknown');

  const response = await get(cfg, `/collaborators/${encodeURIComponent(login)}/permission`);
  // Apps, deleted users and non-collaborators have no permission record; they are not maintainers.
  if (response.status === 404 || response.status === 403) return ignore(`${login} is not a repository collaborator`);
  if (!response.ok) throw new Error(`GitHub permission lookup failed: ${response.status} ${await response.text()}`);

  const body = (await response.json()) as { role_name?: string; permission?: string };
  const role = body.role_name ?? body.permission ?? '';
  if (roles.includes(role)) return true;
  return ignore(`${login} has the ${role || 'unknown'} role, not ${roles.join(' or ')}`);
}

/**
 * Picks the most recent time the label was added from a PR's event history. Only the latest application
 * matters, so whoever added the label last is the person who gets judged. verifyLabel uses it before checking
 * who that was.
 *
 * @param all - A PR's events, oldest first.
 * @param label - The label to look for.
 * @returns The latest "labeled" event for that label, or undefined if there is none.
 */
function lastApplication(all: IssueEvent[], label: string): IssueEvent | undefined {
  return all.filter((e) => e.event === 'labeled' && e.label?.name === label).at(-1);
}

/**
 * Fetches a PR's event history from GitHub, which records who added a label and when. GitHub returns at most
 * 100 events per page, so it keeps asking for the next page while a page comes back full, up to a safety limit.
 * verifyLabel needs this because the PR itself only shows which labels it has now, not who put them there.
 *
 * @param cfg - The repository name, an optional access token, an optional replacement `fetch` for tests, and an
 *   optional logger for rejected labels.
 * @param number - The PR's number.
 * @param page - The page to start from; callers leave this out.
 * @returns Every event on the PR, oldest first.
 * @throws If GitHub answers with an error.
 */
async function events(cfg: GitHubConfig, number: number, page = 1): Promise<IssueEvent[]> {
  if (page > MAX_EVENT_PAGES) return [];

  const response = await get(cfg, `/issues/${number}/events?per_page=100&page=${page}`);
  if (!response.ok) throw new Error(`GitHub event lookup failed: ${response.status} ${await response.text()}`);

  const batch = (await response.json()) as IssueEvent[];
  if (batch.length < 100) return batch;
  return [...batch, ...(await events(cfg, number, page + 1))];
}
