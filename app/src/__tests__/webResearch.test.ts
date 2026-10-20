import { anchorQueries, countLocalFindings, dropUnknownCitations, fallbackQueries, formatWebSources, gatherWebSources } from '@/lib/brain/webResearch';

describe('webResearch', () => {
    const originalKey = process.env.TAVILY_API_KEY;
    afterEach(() => {
        process.env.TAVILY_API_KEY = originalKey;
        jest.restoreAllMocks();
    });

    it('builds fallback queries from the audience and brief', () => {
        const queries = fallbackQueries('A holistic view of time', {
            audience: { role: 'first-time dads', pain: 'balancing work and family' },
            brief: 'For first-time dads managing personal and professional life',
        });
        expect(queries[0]).toBe('first-time dads balancing work and family');
        expect(queries).toContain('A holistic view of time for first-time dads');
        expect(queries).toHaveLength(3);
    });

    it('returns no sources without an API key', async () => {
        delete process.env.TAVILY_API_KEY;
        expect(await gatherWebSources(['anything'])).toEqual([]);
    });

    it('dedupes sources across queries and formats them with domains', async () => {
        process.env.TAVILY_API_KEY = 'test';
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ results: [
                { title: 'New dads at work', url: 'https://www.hbr.org/a', content: 'Fathers report...' },
                { title: 'No content', url: 'https://x.com/b' },
            ] }),
        }) as unknown as typeof fetch;

        const sources = await gatherWebSources(['q1', 'q2']);
        expect(sources).toHaveLength(1);
        expect(formatWebSources(sources)).toContain('[1] New dads at work (hbr.org)');
    });
});

describe('anchorQueries', () => {
    it('appends the audience to queries that drifted to the general topic', () => {
        const meta = { audience: { role: 'Indian dads', pain: '' } };
        expect(anchorQueries(['remote work self-care tips', 'paternity leave for Indian dad in IT'], meta)).toEqual([
            'remote work self-care tips Indian dads',
            'paternity leave for Indian dad in IT',
        ]);
        expect(anchorQueries(['anything'], {})).toEqual(['anything']);
    });
});

describe('place and country', () => {
    afterEach(() => jest.restoreAllMocks());

    it('adds the place the brief is about when a query leaves it out', () => {
        const meta = { audience: { role: 'New dads', pain: '' } };
        expect(anchorQueries(['new dads remote work boundaries', 'paternity leave for Indian dads'], meta, 'India')).toEqual([
            'new dads remote work boundaries India',
            'paternity leave for Indian dads',
        ]);
    });

    it('boosts results from the country and retries without it if rejected', async () => {
        process.env.TAVILY_API_KEY = 'test';
        const fetchMock = jest.fn()
            .mockResolvedValueOnce({ ok: false })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [{ title: 'T', url: 'https://a.in/x', content: 'c' }] }) });
        global.fetch = fetchMock as unknown as typeof fetch;

        const sources = await gatherWebSources(['q'], 12, 'india');
        expect(JSON.parse(fetchMock.mock.calls[0][1].body).country).toBe('india');
        expect(JSON.parse(fetchMock.mock.calls[1][1].body).country).toBeUndefined();
        expect(sources).toHaveLength(1);
    });
});

describe('countLocalFindings', () => {
    it('counts findings that mention the place or a local term', () => {
        const findings = ['Indian firms like Zomato give 26 weeks', 'Keep a dedicated workspace', 'Joint family help in Bengaluru'];
        expect(countLocalFindings(findings, ['India', 'Bengaluru'])).toBe(2);
        expect(countLocalFindings(findings, [])).toBe(0);
    });
});

describe('dropUnknownCitations', () => {
    it('drops findings citing a site that is not in the material', () => {
        const material = '[1] Paternity leave (shrm.org)\nURL: https://www.shrm.org/x\n...';
        const findings = [
            'Only 7% have policies (source: shrm.org)',
            'Indian tech firms offer flexi hours (source: india-today.in)',
            'Gap: no data on joint families',
            'Uncited claim',
            'Named source (source: economic times)',
        ];
        expect(dropUnknownCitations(findings, material)).toEqual([
            'Only 7% have policies (source: shrm.org)',
            'Gap: no data on joint families',
            'Uncited claim',
            'Named source (source: economic times)',
        ]);
    });
});
