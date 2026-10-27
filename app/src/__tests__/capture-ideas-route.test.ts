/** @jest-environment node */
import { POST } from '@/app/api/explore/ideas/route';

const create = jest.fn();
const article = `Juniors with buddies ramp up faster. ${'A long study of mentoring at forty companies. '.repeat(10)}`;
const readPage = jest.fn();
const updates: unknown[] = [];
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
        chain.update = (values: unknown) => { updates.push(values); return chain; };
        chain.maybeSingle = async () => ({ data: null });
        chain.then = (resolve: (v: unknown) => void) => resolve(result);
        return chain;
    };
    return { supabaseAdmin: { from: query } };
});
jest.mock('@/lib/brain/capture-images', () => ({ captureImageUrl: (path?: string | null) => (path ? `https://img/${path}` : undefined) }));


const post = (body: unknown) => POST(new Request('http://localhost/api/explore/ideas', { method: 'POST', body: JSON.stringify(body) }));

describe('post ideas from captures', () => {
    beforeEach(() => {
        create.mockReset().mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ ideas: [{ hook: 'Remote does not kill mentoring', angle: 'Buddy systems', format: 'Contrarian take' }] }) } }] });
        readPage.mockReset().mockResolvedValue({ title: 'Mentoring study', content: article });
        updates.length = 0;
    });

    it('reads the captures, their notes and intent, and pushes back when every capture is a counter', async () => {
        const res = await post({ captureIds: ['a', 'b'] });
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.ideas).toHaveLength(1);
        expect(data.captureSources.map((s: { captureId: string }) => s.captureId)).toEqual(['a', 'b']);
        // The bookmark had no text, so the page was read now
        expect(readPage).toHaveBeenCalledWith('https://example.com/mentoring');
        expect(data.captureSources[1].text).toBe(article.trim());
        // and the text is kept on the bookmark, so it isn't read again
        expect(updates).toEqual([{ ocr_text: article.trim() }]);
        expect(data.unreadCaptures).toBeUndefined();

        const [{ messages }] = create.mock.calls[0];
        const system = messages[0].content as string;
        const user = messages[1].content as string;
        expect(system).toContain('Every idea pushes back on it');
        expect(user).toContain('Remote work kills mentoring.');
        expect(user).toContain('Their note: "Not for juniors with a good buddy system"');
        expect(user).toContain('wants to push back');
    });

    it('says which bookmarks could not be read, and keeps nothing for them', async () => {
        readPage.mockResolvedValue({ title: 'Sign in', content: 'Sign in to continue' });
        const res = await post({ captureIds: ['b'] });
        const data = await res.json();
        expect(res.status).toBe(200);
        expect(data.unreadCaptures).toEqual(['Mentoring study']);
        expect(updates).toEqual([]);
        expect(data.captureSources[0].text).toBeUndefined();
    });

    it('says so when none of the captures are found', async () => {
        const res = await post({ captureIds: ['missing'] });
        expect(res.status).toBe(404);
        expect(create).not.toHaveBeenCalled();
    });
});
