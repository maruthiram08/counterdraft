import { addToTaste, cleanTaste, describeTaste, tasteKey, EMPTY_TASTE } from '@/lib/explore/taste';

describe('explore taste', () => {
    it('keeps the newest signal first and moves it across when the writer changes their mind', () => {
        let taste = addToTaste(EMPTY_TASTE, 'more', 'AI in schools');
        taste = addToTaste(taste, 'more', '  Hiring  juniors ');
        expect(taste).toEqual({ more: ['Hiring juniors', 'AI in schools'], less: [] });
        taste = addToTaste(taste, 'less', 'ai in schools');
        expect(taste).toEqual({ more: ['Hiring juniors'], less: ['ai in schools'] });
        expect(addToTaste(taste, 'less', '   ')).toBe(taste);
    });

    it('caps each list', () => {
        let taste = EMPTY_TASTE;
        for (let i = 0; i < 20; i++) taste = addToTaste(taste, 'less', `topic ${i}`);
        expect(taste.less).toHaveLength(15);
        expect(taste.less[0]).toBe('topic 19');
    });

    it('cleans whatever a request sends', () => {
        expect(cleanTaste({ more: ['ok', 3, '', 'x'.repeat(200)], less: 'nope' })).toEqual({ more: ['ok', 'x'.repeat(120)], less: [] });
        expect(cleanTaste(null)).toEqual({ more: [], less: [] });
    });

    it('describes the taste for prompts and keys caches by it', () => {
        expect(describeTaste(EMPTY_TASTE)).toBe('');
        expect(describeTaste({ more: ['A'], less: ['B'] })).toBe('They asked for more like:\n- A\nThey marked these "Not for me", so avoid them and anything close:\n- B');
        expect(tasteKey(EMPTY_TASTE)).toBe('');
        expect(tasteKey({ more: ['A'], less: [] })).not.toBe(tasteKey({ more: [], less: ['A'] }));
    });
});
