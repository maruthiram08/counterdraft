import { parseSurprise } from '@/lib/explore/surprise';

describe('explore surprise pick', () => {
    it('keeps a complete pick, tidied', () => {
        expect(parseSurprise({ label: ' Olympic  pay gap ', query: 'olympic athletes pay gap', why: 'You write about fair pay at work.' }, ['Remote work']))
            .toEqual({ label: 'Olympic pay gap', query: 'olympic athletes pay gap', why: 'You write about fair pay at work.' });
    });

    it('drops a pick that is missing a part or is one of the usual areas', () => {
        expect(parseSurprise({ label: 'Olympic pay gap', query: 'x' }, [])).toBeNull();
        expect(parseSurprise({ label: 'remote work', query: 'remote work news', why: 'You know it.' }, ['Remote work'])).toBeNull();
        expect(parseSurprise('nope', [])).toBeNull();
    });
});
