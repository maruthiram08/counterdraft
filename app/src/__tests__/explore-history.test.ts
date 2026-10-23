import { monthLabel, parseHistory, type PastPiece } from '@/lib/explore/history';


const pieces: PastPiece[] = [
    { id: 'p1', kind: 'post', text: 'Remote teams need written culture', date: '2026-03-12T10:00:00Z' },
    { id: 'p2', kind: 'draft', text: 'Hiring juniors', date: '2026-05-01T10:00:00Z' },
];

describe('explore topic history', () => {
    it('keeps a match that points at a real piece', () => {
        expect(parseHistory({ match: 0, gist: 'Docs beat meetings.', changed: 'Firms now mandate office days.' }, pieces)).toEqual({
            before: { id: 'p1', kind: 'post', date: '2026-03-12T10:00:00Z', gist: 'Docs beat meetings.', changed: 'Firms now mandate office days.' },
            newGround: false,
        });
    });

    it('treats a missing or invented match as no match', () => {
        expect(parseHistory({ match: 7, gist: 'x', changed: 'y' }, pieces)).toEqual({ newGround: true });
        expect(parseHistory({ match: null, related: true }, pieces)).toEqual({ newGround: false });
        expect(parseHistory('nope', pieces)).toEqual({ newGround: true });
    });

    it('names the month, with the year when it is not this year', () => {
        const now = new Date('2026-10-23T00:00:00Z');
        expect(monthLabel('2026-03-12T10:00:00Z', now)).toBe('March');
        expect(monthLabel('2025-11-02T10:00:00Z', now)).toBe('November 2025');
        expect(monthLabel('bad', now)).toBe('');
    });
});
