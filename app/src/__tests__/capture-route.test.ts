/** @jest-environment node */
import { POST } from '@/app/api/brain/capture/route';
import type { NextRequest } from 'next/server';

const create = jest.fn();
const inserted: Array<Record<string, unknown>> = [];
const removed: unknown[] = [];
let insertError: { code: string } | null = null;

jest.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: 'clerk-1' }) }));
jest.mock('@/lib/user-sync', () => ({ getOrCreateUser: async () => 'user-1' }));
jest.mock('@/lib/openai', () => ({ getOpenAI: () => ({ chat: { completions: { create: (...args: unknown[]) => create(...args) } } }) }));
jest.mock('@/lib/brain/capture-images', () => ({
    storeCaptureImage: async () => 'user-1/captures/x.png',
    removeCaptureImage: async (path: unknown) => { removed.push(path); },
}));
jest.mock('@/lib/supabase-admin', () => ({
    supabaseAdmin: {
        from: () => ({
            insert: (row: Record<string, unknown>) => {
                inserted.push(row);
                const chain = { select: () => chain, single: async () => (insertError ? { data: null, error: insertError } : { data: { id: 'cap-1', ...row }, error: null }) };
                return chain;
            },
        }),
    },
}));

const post = (body: unknown) => POST(new Request('http://localhost/api/brain/capture', { method: 'POST', body: JSON.stringify(body) }) as unknown as NextRequest);
const snip = { imageBase64: 'data:image/png;base64,aGVsbG8=', captureKind: 'snip', sourceUrl: 'https://example.com/a', pageTitle: 'A page', userNote: '' };

describe('saving a capture', () => {
    beforeEach(() => {
        create.mockReset();
        inserted.length = 0;
        removed.length = 0;
        insertError = null;
    });

    it('keeps the capture and its page text when reading the image fails', async () => {
        create.mockRejectedValue(new Error('timeout'));
        const res = await post({ ...snip, pageText: 'The exact words from the page.' });
        expect(res.status).toBe(200);
        expect(inserted[0]).toMatchObject({
            ocr_text: 'The exact words from the page.',
            image_path: 'user-1/captures/x.png',
            ai_metadata: { kind: 'snip', analysis_failed: true },
        });
    });

    it('removes the stored image when the capture cannot be saved', async () => {
        create.mockResolvedValue({ choices: [{ message: { content: '{"ocr_text":"Hi"}' } }] });
        insertError = { code: '500' };
        const res = await post(snip);
        expect(res.status).toBe(500);
        expect(removed).toEqual(['user-1/captures/x.png']);
    });
});
