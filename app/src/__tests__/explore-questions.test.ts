import { cleanTitle, isQuestion, parseQuestions, questionSearches, questionsFromTitles, sourceName } from '@/lib/explore/questions';

jest.mock('@/lib/openai', () => ({ openai: {} }));

const threads = [
    { title: 'r/ProductManagement on Reddit: How do you price a B2C app in India?', url: 'https://www.reddit.com/r/ProductManagement/comments/abc', content: 'We are launching a consumer app for parents and cannot decide between freemium and a trial.' },
    { title: 'What is the best launch channel for a consumer app? - Quora', url: 'https://www.quora.com/What-is-the-best-launch-channel' },
    { title: 'Show HN: My new todo app', url: 'https://news.ycombinator.com/item?id=1' },
];

describe('questions people ask', () => {
    it('names community sources and strips their title furniture', () => {
        expect(sourceName(threads[0].url)).toBe('Reddit');
        expect(sourceName('https://news.ycombinator.com/item?id=1')).toBe('Hacker News');
        expect(sourceName('https://pm.stackexchange.com/q/1')).toBe('Stack Exchange');
        expect(cleanTitle(threads[0].title)).toBe('How do you price a B2C app in India?');
        expect(cleanTitle(threads[1].title)).toBe('What is the best launch channel for a consumer app?');
    });

    it('searches the topic as typed and as a request for advice', () => {
        expect(questionSearches('  B2C pricing?  ')).toEqual(['B2C pricing', 'B2C pricing advice questions']);
    });

    it('keeps only questions that point at a returned thread, once each', () => {
        const parsed = parseQuestions({
            questions: [
                { question: 'How should a parenting app in India choose between freemium and a trial', theme: 'Pricing', url: threads[0].url },
                { question: 'How should a parenting app in India choose between freemium and a trial?', theme: 'Pricing', url: threads[1].url },
                { question: 'Invented question?', theme: 'Made up', url: 'https://www.reddit.com/r/none' },
                { question: 'Second question from the same thread?', theme: 'Pricing', url: threads[0].url },
                { theme: 'Broken' },
            ],
        }, threads);

        expect(parsed).toEqual([{
            question: 'How should a parenting app in India choose between freemium and a trial?',
            theme: 'Pricing',
            url: threads[0].url,
            source: 'Reddit',
            detail: threads[0].content,
        }]);
        expect(parseQuestions('not json', threads)).toEqual([]);
    });

    it('falls back to thread titles that are questions', () => {
        expect(isQuestion('Show HN: My new todo app')).toBe(false);
        const fallback = questionsFromTitles(threads);
        expect(fallback.map(q => q.question)).toEqual([
            'How do you price a B2C app in India?',
            'What is the best launch channel for a consumer app?',
        ]);
        expect(fallback.every(q => q.theme === 'Asked online')).toBe(true);
    });
});
