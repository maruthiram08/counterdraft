import { parseDebate } from '@/lib/explore/debate';

jest.mock('@/lib/openai', () => ({ openai: {} }));

describe('explore debate map', () => {
    it('keeps takes backed by real stories, most covered first', () => {
        expect(parseDebate({
            takes: [
                { take: 'AI tutors help struggling students', stories: [0] },
                { take: 'Schools are banning chatbots', stories: [1, 2, 2, 9] },
                { take: 'Made up', stories: [7] },
                { take: '', stories: [0] },
            ],
            gap: { take: 'Nobody asks what teachers stop doing', why: 'Coverage is about students only.' },
        }, 3)).toEqual({
            takes: [
                { take: 'Schools are banning chatbots', stories: [1, 2] },
                { take: 'AI tutors help struggling students', stories: [0] },
            ],
            gap: { take: 'Nobody asks what teachers stop doing', why: 'Coverage is about students only.' },
        });
    });

    it('has nothing to show with one take and no gap', () => {
        expect(parseDebate({ takes: [{ take: 'Only one', stories: [0] }] }, 3)).toBeNull();
        expect(parseDebate(null, 3)).toBeNull();
    });
});
