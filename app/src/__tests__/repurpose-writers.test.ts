const create = jest.fn();
jest.mock('@/lib/openai', () => ({ openai: { chat: { completions: { create: (...args: unknown[]) => create(...args) } } } }));

import { repurposeContent } from '@/lib/content/repurposing';
import { parseThread, xLength } from '@/lib/content/x-thread';
import { parseNewsletter } from '@/lib/content/newsletter';

const reply = (json: unknown) => ({ choices: [{ message: { content: JSON.stringify(json) } }] });

describe('repurpose writers', () => {
    beforeEach(() => create.mockReset());

    it('writes a thread, retrying once when posts run long and splitting any still too long', async () => {
        const long = 'A sentence that keeps going on. '.repeat(12).trim();
        create
            .mockResolvedValueOnce(reply({ title: 'T', posts: ['Hook', long, long] }))
            .mockResolvedValueOnce(reply({ title: 'T2', posts: ['Hook', long] }));
        const result = await repurposeContent('source', 'x_thread', { length: 'short', numbered: true });

        expect(create).toHaveBeenCalledTimes(2);
        expect(create.mock.calls[0][0].messages[0].content).toContain('3 to 5 posts');
        const posts = parseThread(result.content);
        expect(posts[0]).toBe('Hook');
        posts.forEach(p => expect(xLength(p)).toBeLessThanOrEqual(273));
        expect(result.title).toBe('T2');
        expect(result.extraData).toEqual({ numbered: true });
    });

    it('fails clearly when no thread comes back', async () => {
        create.mockResolvedValue(reply({ posts: [] }));
        await expect(repurposeContent('source', 'x_thread', {})).rejects.toThrow("Couldn't write the thread");
    });

    it('writes a newsletter with subject and preview text at the top of the draft', async () => {
        create.mockResolvedValueOnce(reply({ subject: 'Subject', previewText: 'Preview', body: '## Part\n\nText' }));
        const result = await repurposeContent('source', 'newsletter', { length: 'long' });

        expect(create.mock.calls[0][0].messages[0].content).toContain('about 1000 words');
        expect(result.title).toBe('Subject');
        expect(parseNewsletter(result.content)).toEqual({ subject: 'Subject', previewText: 'Preview', body: '## Part\n\nText' });
    });
});
