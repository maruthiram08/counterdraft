import { FOR_YOU, buildTrendSearch } from '@/lib/explore/trends';

describe('explore starting topics', () => {
    it('searches what the writer works on for "For you", and skips it without a profile', () => {
        expect(buildTrendSearch(FOR_YOU, { role: 'Founder', context: 'Building a parenting app for Indian dads', beliefs: [] }))
            .toBe('news and debates this week for Founder: Building a parenting app for Indian dads');
        expect(buildTrendSearch(FOR_YOU, { beliefs: [] })).toBeNull();
    });

    it('narrows a fixed category to the writer role when known', () => {
        expect(buildTrendSearch('Business Strategy', { role: 'Founder', beliefs: [] }))
            .toBe('news and debates this week in Business Strategy that matter to Founder');
        expect(buildTrendSearch('Business Strategy', { beliefs: [] })).toBe('news and debates this week in Business Strategy');
    });
});
