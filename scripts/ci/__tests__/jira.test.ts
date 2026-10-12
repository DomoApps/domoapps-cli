import { bugJql, checkAccess, JiraConfig, search } from '../jira';

interface Call {
  url: string;
  init: RequestInit;
}

function fakeFetch(pages: Array<{ status?: number; body: unknown }>) {
  const calls: Call[] = [];
  const fn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const page = pages[calls.length - 1];
    if (!page) throw new Error(`unexpected request #${calls.length}`);
    const status = page.status ?? 200;
    return new Response(JSON.stringify(page.body), { status });
  }) as unknown as typeof fetch;
  return { fn, calls };
}

function cfg(fetchFn: typeof fetch): JiraConfig {
  return {
    baseUrl: 'https://domoinc.atlassian.net/',
    email: 'ci@domo.com',
    token: 's3cret',
    projects: ['DOMO'],
    fetchFn,
  };
}

const issue = (key: string, statusCategory: string, resolution: string | null) => ({
  key,
  fields: {
    created: '2026-10-01T12:00:00.000+0000',
    status: { statusCategory: { key: statusCategory } },
    resolution: resolution === null ? null : { name: resolution },
  },
});

describe('bugJql', () => {
  it('quotes projects and dotted labels', () => {
    expect(bugJql(['DOMO'], ['ryuu-6.0.10', 'ryuu-6.0.10-beta.0'])).toBe(
      'project in ("DOMO") AND issuetype = Bug AND labels in ("ryuu-6.0.10", "ryuu-6.0.10-beta.0")',
    );
  });
});

describe('search', () => {
  it('posts to the Cloud enhanced-search endpoint with basic auth', async () => {
    const { fn, calls } = fakeFetch([{ body: { issues: [], isLast: true } }]);
    await search(cfg(fn), 'issuetype = Bug');
    expect(calls[0].url).toBe('https://domoinc.atlassian.net/rest/api/3/search/jql');
    expect(calls[0].init.method).toBe('POST');
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Basic ${Buffer.from('ci@domo.com:s3cret').toString('base64')}`);
    expect(JSON.parse(String(calls[0].init.body))).toMatchObject({ jql: 'issuetype = Bug', maxResults: 100 });
  });

  it('follows nextPageToken until isLast and maps the fields lib.ts needs', async () => {
    const { fn, calls } = fakeFetch([
      { body: { issues: [issue('DOMO-1', 'new', null)], nextPageToken: 'p2', isLast: false } },
      { body: { issues: [issue('DOMO-2', 'done', 'Duplicate')], isLast: true } },
    ]);
    const found = await search(cfg(fn), 'issuetype = Bug');
    expect(JSON.parse(String(calls[1].init.body)).nextPageToken).toBe('p2');
    expect(found).toEqual([
      { key: 'DOMO-1', created: '2026-10-01T12:00:00.000+0000', statusCategory: 'new', resolution: null },
      { key: 'DOMO-2', created: '2026-10-01T12:00:00.000+0000', statusCategory: 'done', resolution: 'Duplicate' },
    ]);
  });

  it('throws on a non-2xx response instead of reporting zero bugs', async () => {
    const { fn } = fakeFetch([{ status: 401, body: { errorMessages: ['Unauthorized'] } }]);
    await expect(search(cfg(fn), 'issuetype = Bug')).rejects.toThrow(/Jira search failed: 401/);
  });
});

describe('checkAccess', () => {
  it('passes when the token can see at least one bug', async () => {
    const { fn, calls } = fakeFetch([{ body: { issues: [issue('DOMO-1', 'done', 'Done')], isLast: true } }]);
    await expect(checkAccess(cfg(fn))).resolves.toBeUndefined();
    expect(JSON.parse(String(calls[0].init.body))).toMatchObject({
      jql: 'project in ("DOMO") AND issuetype = Bug',
      maxResults: 1,
    });
  });

  it('reads a single row rather than paging through every bug', async () => {
    const { fn, calls } = fakeFetch([
      { body: { issues: [issue('DOMO-1', 'done', 'Done')], nextPageToken: 'p2', isLast: false } },
    ]);
    await checkAccess(cfg(fn));
    expect(calls).toHaveLength(1);
  });

  it('throws when the token sees no bugs, so a permissions gap cannot pass the gate', async () => {
    const { fn } = fakeFetch([{ body: { issues: [], isLast: true } }]);
    await expect(checkAccess(cfg(fn))).rejects.toThrow(/sees no Bug issues/);
  });
});
