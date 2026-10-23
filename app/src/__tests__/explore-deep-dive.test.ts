import { needsSearchFallback, parseDeepDive } from '@/lib/explore/deep-dive';

jest.mock('@/lib/openai', () => ({ openai: {} }));
jest.mock('@/lib/read-page', () => ({ readPage: jest.fn() }));

describe('explore deep dive', () => {
    it('keeps well-formed parts and drops the rest', () => {
        expect(parseDeepDive({
            summary: ' Firms let teams pick office days. ',
            keyPoints: ['Attendance is flat at 3 days.', '', 42, 'a', 'b', 'c', 'd'],
            viewpoints: [{ who: 'Landlords', view: 'Mandates return.' }, { who: '', view: 'x' }, 'bad'],
            openQuestions: ['Who gets promoted?', 'Q2', 'Q3'],
        })).toEqual({
            summary: 'Firms let teams pick office days.',
            keyPoints: ['Attendance is flat at 3 days.', 'a', 'b', 'c', 'd'],
            viewpoints: [{ who: 'Landlords', view: 'Mandates return.' }],
            openQuestions: ['Who gets promoted?', 'Q2'],
        });
    });

    it('has nothing to show without a summary', () => {
        expect(parseDeepDive({ summary: '' })).toBeNull();
        expect(parseDeepDive(null)).toBeNull();
    });

    it('looks the story up elsewhere for Google News links and thin pages', () => {
        const long = 'x'.repeat(800);
        expect(needsSearchFallback('https://news.google.com/rss/articles/abc', long)).toBe(true);
        expect(needsSearchFallback('https://example.com/story', 'short page')).toBe(true);
        expect(needsSearchFallback('https://example.com/story', long)).toBe(false);
        expect(needsSearchFallback('not a url', long)).toBe(true);
    });
});
