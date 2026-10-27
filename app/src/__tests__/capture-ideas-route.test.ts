/** @jest-environment node */
import { POST } from '@/app/api/explore/ideas/route';

const create = jest.fn();
const readPage = jest.fn();
const captureRows = [
    { id: 'a', source_url: 'https://www.linkedin.com/feed/', source_title: 'Post by Priya', source_domain: 'www.linkedin.com', ocr_text: 'Remote work kills mentoring.', user_note: 'Not for juniors with a good buddy system', intent_type: 'counter', ai_metadata: { kind: 'frame' } },
    { id: 'b', source_url: 'https://example.com/mentoring', source_title: 'Mentoring study', source_domain: 'example.com', ocr_text: '', user_note: '', intent_type: 'counter', ai_metadata: { type: 'bookmark' } },
];

jest.mock('@/lib/user-sync', () => ({ getOrCreateUser: jest.fn(async () => 'user-1') }));
jest.mock('@/lib/rate-limit', () => ({ getClientIp: () => 'ip', rateLimit: () => ({ allowed: true }) }));
jest.mock('@/lib/moderation', () => ({ moderateContent: jest.fn(async () => ({ flagged: false })), getModerationErrorMessage: jest.fn() }));
jest.mock('@/lib/trace', () => ({ TraceLogger: { log: jest.fn() } }));
jest.mock('@/lib/billing/usage', () => ({
    UsageService: { checkSearchLimit: jest.fn(async () => ({ allowed: true })), incrementSearchCount: jest.fn() },
}));
jest.mock('@/lib/openai', () => ({ SAFETY_PREAMBLE: '', openai: { chat: { completions: { create: (...args: unknown[]) => create(...args) } } } }));
jest.mock('@/lib/read-page', () => ({ readPage: (...args: unknown[]) => readPage(...args) }));
jest.mock('@/lib/supabase-admin', () => {
    // Every query resolves to the captures for thinking_artifacts and to nothing elsewhere
    const query = (table: string) => {
        const result = table === 'thinking_artifacts' ? { data: captureRows } : { data: [] };
        const chain: Record<string, unknown> = {};
        for (const m of ['select', 'eq', 'in', 'order', 'limit']) chain[m] = () => chain;
        chain.maybeSingle = async () => ({ data: null });
        chain.then = (resolve: (v: unknown) => void) => resolve(result);
        return chain;
    };
    return { supabaseAdmin: { from: query } };
});

const post = (body: unknown) => POST(new Request('http://localhost/api/explore/ideas', { method: 'POST', body: JSON.stringify(body) }));

describe('post ideas from captures', () => {
    beforeEach(() => {
        create.mockReset().mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ ideas: [{ hook: 'Remote does not kill mentoring', angle: 'Buddy systems', format: 'Contrarian take' }] }) } }] });
        readPage.mockReset().mockResolvedValue({ title: 'Mentoring study', content: 'Juniors with buddies ramp up faster.' });
    });

    it('reads the captures, their notes and intent, and pushes back when every capture is a counter', async () => {
        const res = await post({ captureIds: ['a', 'b'] });
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.ideas).toHaveLength(1);
        expect(data.captureSources.map((s: { captureId: string }) => s.captureId)).toEqual(['a', 'b']);
        // The bookmark had no text, so the page was read now
        expect(readPage).toHaveBeenCalledWith('https://example.com/mentoring');
        expect(data.captureSources[1].text).toBe('Juniors with buddies ramp up faster.');

        const [{ messages }] = create.mock.calls[0];
        const system = messages[0].content as string;
        const user = messages[1].content as string;
        expect(system).toContain('Every idea pushes back on it');
        expect(user).toContain('Remote work kills mentoring.');
        expect(user).toContain('Their note: "Not for juniors with a good buddy system"');
        expect(user).toContain('wants to push back');
    });

    it('says so when none of the captures are found', async () => {
        const res = await post({ captureIds: ['missing'] });
        expect(res.status).toBe(404);
        expect(create).not.toHaveBeenCalled();
    });
});
