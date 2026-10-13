// Minimal Jira Cloud client for the release gates. Resolution names and dates are
// filtered in lib.ts, not JQL: names vary by project and JQL dates use the token
// owner's timezone.

import type { JiraIssue } from './lib';

export interface JiraConfig {
  baseUrl: string;
  email: string;
  token: string;
  projects: string[];
  fetchFn?: typeof fetch;
}

interface SearchPage {
  issues: Array<{
    key: string;
    fields: {
      created: string;
      status: { statusCategory: { key: string } };
      resolution: { name: string } | null;
    };
  }>;
  nextPageToken?: string;
  isLast?: boolean;
}

/**
 * Wraps text in double quotes for a Jira search, escaping any quote or backslash inside it. Labels contain
 * dots, so they have to be quoted to be read correctly. bugJql and projectClause use it for every project and
 * label they insert.
 *
 * @param s - The text to quote.
 * @returns The quoted, escaped text.
 */
const quote = (s: string) => `"${s.replace(/["\\]/g, '\\$&')}"`;

/**
 * Builds the first half of every bug search: "issues of type Bug in these projects". bugJql adds the label
 * filter to it, and checkAccess uses it on its own to see whether the account can see any bugs at all.
 *
 * @param projects - Jira project keys, such as `DOMO`.
 * @returns Search text (JQL) matching every Bug in those projects.
 */
function projectClause(projects: string[]): string {
  return `project in (${projects.map(quote).join(', ')}) AND issuetype = Bug`;
}

/**
 * Builds the Jira search text for "bugs in these projects that carry any of these labels". release.ts runs it
 * for the labels that belong to a version, then lib.ts decides which of the results actually block the release.
 *
 * @param projects - Jira project keys, such as `DOMO`.
 * @param labels - Labels to match, such as `ryuu-6.0.10`.
 * @returns Search text (JQL) for those bugs.
 */
export function bugJql(projects: string[], labels: string[]): string {
  return `${projectClause(projects)} AND labels in (${labels.map(quote).join(', ')})`;
}

/**
 * Runs a Jira search and returns every matching issue, reading as many pages as needed or stopping once `limit`
 * issues have been collected. It signs in with the account email and API token and keeps only the fields the
 * release rules need: key, creation date, status category and resolution. release.ts uses it to find bugs, and
 * checkAccess uses it to prove the token works.
 *
 * @param cfg - The Jira site address, sign-in details, projects to search, and an optional replacement `fetch`
 *   for tests.
 * @param jql - The search text to run.
 * @param limit - The most issues to return; defaults to all of them.
 * @returns The matching issues in the shape lib.ts expects.
 * @throws If Jira answers with an error, so a failed lookup is never mistaken for "no bugs".
 */
export async function search(cfg: JiraConfig, jql: string, limit = Infinity): Promise<JiraIssue[]> {
  const fetchFn = cfg.fetchFn ?? fetch;
  const maxResults = Math.min(100, limit);
  const url = `${cfg.baseUrl.replace(/\/+$/, '')}/rest/api/3/search/jql`;
  const auth = Buffer.from(`${cfg.email}:${cfg.token}`).toString('base64');
  const found: JiraIssue[] = [];
  let nextPageToken: string | undefined;

  do {
    const res = await fetchFn(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jql, maxResults, fields: ['created', 'status', 'resolution'], nextPageToken }),
    });
    if (!res.ok) throw new Error(`Jira search failed: ${res.status} ${await res.text()}`);

    const page = (await res.json()) as SearchPage;
    for (const i of page.issues) {
      found.push({
        key: i.key,
        created: i.fields.created,
        statusCategory: i.fields.status.statusCategory.key,
        resolution: i.fields.resolution?.name ?? null,
      });
    }
    nextPageToken = page.isLast === false ? page.nextPageToken : undefined;
  } while (nextPageToken && found.length < limit);

  return found;
}

/**
 * Proves the Jira account can see bugs before anyone trusts an empty result. If a missing permission hid every
 * bug, a release would look bug-free, so this fails loudly instead. release.ts runs it once before the first
 * bug check of a run.
 *
 * @param cfg - The Jira site address, sign-in details, projects to search, and an optional replacement `fetch`
 *   for tests.
 * @returns Nothing; it finishes quietly when at least one Bug is visible.
 * @throws If the account sees no Bug issues in the configured projects.
 */
export async function checkAccess(cfg: JiraConfig): Promise<void> {
  const found = await search(cfg, projectClause(cfg.projects), 1);
  if (!found.length) {
    throw new Error(`Jira token sees no Bug issues in ${cfg.projects.join(', ')}; check JIRA_EMAIL/JIRA_API_TOKEN permissions`);
  }
}
