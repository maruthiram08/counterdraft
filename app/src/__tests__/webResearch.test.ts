import { fallbackQueries, formatWebSources, gatherWebSources } from '@/lib/brain/webResearch';

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
