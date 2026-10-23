import { FOR_YOU, GENERAL_CATEGORIES, buildTrendSearch, describeTrackRecord, exploreTrackRecord, pickCategories } from '@/lib/explore/trends';

describe('explore starting topics', () => {
    it('searches what the writer works on for "For you", and skips it without a profile', () => {
        expect(buildTrendSearch(FOR_YOU, { role: 'Founder', context: 'Building a parenting app for Indian dads', beliefs: [] }))
            .toBe('news and debates this week for Founder: Building a parenting app for Indian dads');
        expect(buildTrendSearch(FOR_YOU, { beliefs: [] })).toBeNull();
    });

    it('learns from Explore topics that got written, published ones first', () => {
        const wrote = exploreTrackRecord([
            { hook: 'Docs beat meetings', stage: 'draft', brain_metadata: { explore: { query: 'remote work' } } },
            { hook: 'Async hiring wins', stage: 'published', brain_metadata: { explore: { query: 'async hiring', label: 'Async hiring' } } },
            { hook: 'Another remote post', stage: 'published', brain_metadata: { explore: { query: 'Remote work' } } },
            { hook: 'No origin', stage: 'draft', brain_metadata: null },
        ]);
        expect(wrote).toEqual([
            { topic: 'Async hiring', published: true },
            { topic: 'Remote work', published: true },
            { topic: 'No origin', published: false },
        ]);
        expect(describeTrackRecord(wrote)).toContain('- Async hiring (published)');
        expect(describeTrackRecord([])).toBe('');
        expect(buildTrendSearch(FOR_YOU, { beliefs: [], wrote })).toBe('news and debates this week on Async hiring, Remote work, No origin');
    });

    it('narrows a fixed category to the writer role when known', () => {
        expect(buildTrendSearch('Business Strategy', { role: 'Founder', beliefs: [] }))
            .toBe('news and debates this week in Business Strategy that matter to Founder');
        expect(buildTrendSearch('Business Strategy', { beliefs: [] })).toBe('news and debates this week in Business Strategy');
    });

    describe('pickCategories', () => {
        const niche = ['Fatherhood', 'Indian workplace', 'Remote work', 'Child health', 'School admissions', 'Family money'];

        it('picks a set led by the writer niche, with no repeats', () => {
            const picked = pickCategories(niche, []);
            expect(picked).toHaveLength(5);
            expect(new Set(picked.map(c => c.toLowerCase())).size).toBe(5);
            expect(picked.filter(c => niche.includes(c)).length).toBeGreaterThanOrEqual(3);
        });

        it('skips the categories just seen', () => {
            const first = pickCategories(niche, []);
            const next = pickCategories(niche, first);
            expect(next.filter(c => first.includes(c))).toEqual([]);
        });

        it('falls back to general categories without a niche, and still fills the set when most are excluded', () => {
            expect(pickCategories([], []).every(c => GENERAL_CATEGORIES.includes(c))).toBe(true);
            expect(pickCategories([], GENERAL_CATEGORIES.slice(0, 13))).toHaveLength(5);
        });
    });
});
