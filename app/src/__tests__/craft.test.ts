import { acceptSelfEdit, formatStyleExamples, pickStyleExamples, selfEditChecklist } from '@/lib/brain/craft';

const long = (topic: string, extra = '') => `${topic} ${'Some real sentences about the work and what I learned from it. '.repeat(5)}${extra}`;

describe('pickStyleExamples', () => {
    it('prefers posts on the same topic, then the newest', () => {
        const posts = [
            { text: long('Hiring engineers is broken'), date: '2026-01-01' },
            { text: long('My morning routine'), date: '2026-09-01' },
            { text: long('Remote hiring for startup engineers'), date: '2026-03-01' },
        ];
        const picked = pickStyleExamples(posts, 'How startups should approach hiring engineers', 2);
        expect(picked).toHaveLength(2);
        expect(picked[0]).toContain('Remote hiring for startup engineers');
        expect(picked[1]).toContain('Hiring engineers is broken');
    });

    it('falls back to recent posts when nothing matches the topic', () => {
        const posts = [
            { text: long('Old note'), date: '2025-01-01' },
            { text: long('New note'), date: '2026-05-01' },
        ];
        expect(pickStyleExamples(posts, 'quantum chemistry', 1)[0]).toContain('New note');
    });

    it('skips short posts, duplicates and trims very long ones', () => {
        const dup = long('Same post');
        const posts = [
            { text: 'Check out this link' },
            { text: dup },
            { text: dup },
            { text: long('Huge', 'x'.repeat(3000)) },
        ];
        const picked = pickStyleExamples(posts, 'anything', 5);
        expect(picked).toHaveLength(2);
        expect(picked.every(p => p.length <= 1501)).toBe(true);
    });
});

describe('formatStyleExamples', () => {
    it('is empty without examples', () => {
        expect(formatStyleExamples([])).toBe('');
    });

    it('labels each post and says not to reuse the content', () => {
        const text = formatStyleExamples(['First', 'Second']);
        expect(text).toContain('--- Post 2 ---\nSecond');
        expect(text).toContain('Do not reuse their topics');
    });
});

describe('selfEditChecklist', () => {
    it('names the flagged words found in the draft', () => {
        expect(selfEditChecklist('We delve into a robust plan.')).toMatch(/"delve", "robust"/);
        expect(selfEditChecklist('A plain post.')).not.toContain('were flagged');
    });
});

describe('acceptSelfEdit', () => {
    const original = 'A draft with a hook.\n\nA middle with [add your own example of a hire].\n\nAn ending that lands.';

    it('keeps a reasonable edit', () => {
        const edited = 'A draft with a sharper hook.\n\nA middle with [add your own example of a hire].\n\nAn ending.';
        expect(acceptSelfEdit(original, edited)).toBe(edited);
    });

    it('keeps the original when the edit is empty, gutted or ballooned', () => {
        expect(acceptSelfEdit(original, '')).toBe(original);
        expect(acceptSelfEdit(original, null)).toBe(original);
        expect(acceptSelfEdit(original, 'Too short [add your own example of a hire]')).toBe(original);
        expect(acceptSelfEdit(original, original + original)).toBe(original);
    });

    it('keeps the original when a placeholder went missing', () => {
        const edited = original.replace('[add your own example of a hire]', 'my colleague Sam, who was hired last year');
        expect(acceptSelfEdit(original, edited)).toBe(original);
    });

    it('keeps the original when a suggested passage lost its marks', () => {
        const suggested = 'A draft with a hook.\n\n<suggested>When India won in 2011, our office stopped to watch.</suggested>\n\nAn ending that lands.';
        const tightened = suggested.replace('our office stopped', 'the office stopped');
        expect(acceptSelfEdit(suggested, tightened)).toBe(tightened);
        expect(acceptSelfEdit(suggested, suggested.replace(/<\/?suggested>/g, ''))).toBe(suggested);
    });
});
