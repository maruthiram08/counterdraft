import { newSince, watchQuery } from '@/lib/explore/watch';
import type { RawFeedItem } from '@/lib/explore/feed';

const item = (title: string, pubDate?: string): RawFeedItem => ({ title, link: `https://n.com/${title}`, source: 'N', pubDate, otherSources: [], query: 'q' });

describe('explore watched topics', () => {
    it('turns a saved headline into a short news search', () => {
        expect(watchQuery('Why the UK is banning phones in schools - BBC News')).toBe('UK banning phones schools');
        expect(watchQuery('OpenAI says GPT-6 will cost 40% less to run, and that changes everything for startups'))
            .toBe('OpenAI GPT-6 cost 40% less run');
        expect(watchQuery('')).toBe('');
    });

    it('counts only stories after the last look, newest first, without the saved story', () => {
        const items = [
            item('Old take', 'Mon, 20 Oct 2026 10:00:00 GMT'),
            item('Follow-up one', 'Wed, 22 Oct 2026 10:00:00 GMT'),
            item('UK bans phones in schools', 'Thu, 23 Oct 2026 09:00:00 GMT'),
            item('Follow-up two', 'Thu, 23 Oct 2026 10:00:00 GMT'),
            item('Undated'),
        ];
        expect(newSince(items, '2026-10-21T00:00:00Z', 'UK bans phones in schools').map(i => i.title))
            .toEqual(['Follow-up two', 'Follow-up one']);
    });
});
