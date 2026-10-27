/** @jest-environment node */
import { brainGenerationService } from '@/lib/brain/generation';
import type { BrainMetadata } from '@/types';

const create = jest.fn();

jest.mock('@/lib/trace', () => ({ TraceLogger: { log: jest.fn() } }));
jest.mock('@/lib/voice/service', () => ({ voiceService: { getProfile: jest.fn(async () => null) } }));
jest.mock('@/lib/openai', () => ({ SAFETY_PREAMBLE: '', openai: { chat: { completions: { create: (...args: unknown[]) => create(...args) } } } }));
jest.mock('@/lib/supabase-admin', () => {
    const query = () => {
        const chain: Record<string, unknown> = {};
        for (const m of ['select', 'eq', 'in', 'order', 'limit']) chain[m] = () => chain;
        chain.then = (resolve: (v: unknown) => void) => resolve({ data: [] });
        return chain;
    };
    return { supabaseAdmin: { from: query } };
});

const meta = {
    outcome: '',
    confidence: 'medium',
    reframe: {
        mode: 'push_back',
        take: 'Small teams need their meetings',
        captureId: 'cap-9',
        author: 'Priya Raman',
        original: 'Most teams need fewer meetings. I cut ours by half.',
    },
    explore: { query: '', from: 'captures', sources: [{ title: 'Feed', url: '', captureId: 'cap-9', note: 'Works for big teams only' }] },
} as BrainMetadata;

const reply = (content: string) => ({ choices: [{ message: { content } }] });

describe('reframe drafts', () => {
    beforeEach(() => {
        create.mockReset()
            .mockResolvedValueOnce(reply('Priya Raman says cut meetings. On a team of four, that backfires.'))
            .mockResolvedValueOnce(reply('Priya Raman says cut meetings. On a team of four, that backfires.'));
    });

    it('drafts straight from the captured post, with no outline brief', async () => {
        const result = await brainGenerationService.generateDraft({ userId: 'u1', hook: 'Pushing back', outline: [], brainMetadata: meta });
        expect(result.draft).toMatch(/team of four/);
        // One draft call and one self-edit, no drafting brief
        expect(create).toHaveBeenCalledTimes(2);
        const [system, user] = create.mock.calls[0][0].messages;
        expect(system.content).toMatch(/Push back/);
        expect(system.content).toMatch(/Small teams need their meetings/);
        expect(user.content).toMatch(/THE ORIGINAL POST by Priya Raman/);
        expect(user.content).toMatch(/Works for big teams only/);
    });

    it('uses the outlined path once research or an outline exists', async () => {
        create.mockReset().mockResolvedValue(reply('Brief'));
        await brainGenerationService.generateDraft({ userId: 'u1', hook: 'Pushing back', outline: [{ text: 'Open', notes: [] }], brainMetadata: meta });
        expect(create.mock.calls[0][0].messages[0].content).toMatch(/editorial architect/);
    });
});
