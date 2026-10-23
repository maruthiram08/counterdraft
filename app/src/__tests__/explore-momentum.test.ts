import { storyMomentum, topicMomentum } from '@/lib/explore/momentum';

const NOW = Date.parse('2026-10-23T12:00:00Z');
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

describe('explore momentum', () => {
    it('tags a fresh story picked up by a few outlets as rising', () => {
        expect(storyMomentum({ publishedAt: daysAgo(1), sourceCount: 3 }, NOW)).toBe('rising');
    });

    it('leaves a fresh story from one outlet untagged', () => {
        expect(storyMomentum({ publishedAt: daysAgo(1), sourceCount: 1 }, NOW)).toBeNull();
    });

    it('tags a widely covered story as crowded, however new', () => {
        expect(storyMomentum({ publishedAt: daysAgo(0.2), sourceCount: 6 }, NOW)).toBe('crowded');
    });

    it('tags old pieces and lasting formats as evergreen', () => {
        expect(storyMomentum({ publishedAt: daysAgo(200) }, NOW)).toBe('evergreen');
        expect(storyMomentum({ kind: 'framework' }, NOW)).toBe('evergreen');
        expect(storyMomentum({ kind: 'framework', publishedAt: daysAgo(3) }, NOW)).toBeNull();
    });

    it('tags a topic rising when most of its stories are from the last few days', () => {
        expect(topicMomentum([
            { publishedAt: daysAgo(1) }, { publishedAt: daysAgo(2) }, { publishedAt: daysAgo(0.5) }, { publishedAt: daysAgo(40) },
        ], NOW)).toEqual({ tag: 'rising', reason: '3 of 4 stories are from the last 3 days' });
    });

    it('tags a topic crowded when several stories are everywhere', () => {
        expect(topicMomentum([
            { publishedAt: daysAgo(1), sourceCount: 8 }, { publishedAt: daysAgo(1), sourceCount: 5 },
            { publishedAt: daysAgo(2), sourceCount: 6 }, { publishedAt: daysAgo(3) },
        ], NOW)?.tag).toBe('crowded');
    });

    it('says nothing without enough dated stories', () => {
        expect(topicMomentum([{ publishedAt: daysAgo(1) }, {}, {}], NOW)).toBeNull();
    });
});
