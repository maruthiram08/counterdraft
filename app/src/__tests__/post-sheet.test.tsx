import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PostSheet } from '@/components/editor/PostSheet';
import { cleanPostUrl, isManualRecord, postUrl, postPlatforms } from '@/lib/posts/posted';
import type { Draft } from '@/types';

const draft: Draft = {
    id: 'd1',
    belief_text: 'Title',
    content: 'Body',
    status: 'draft',
    created_at: '2026-10-26T10:00:00Z',
    updated_at: '2026-10-26T10:00:00Z',
};

describe('posted helpers', () => {
    it('keeps only real http(s) links that fit', () => {
        expect(cleanPostUrl('linkedin.com/posts/abc')).toBe('https://linkedin.com/posts/abc');
        expect(cleanPostUrl('https://x.com/me/status/1')).toBe('https://x.com/me/status/1');
        expect(cleanPostUrl('javascript:alert(1)')).toBeNull();
        expect(cleanPostUrl('not a link')).toBeNull();
        expect(cleanPostUrl('https://a.com/' + 'x'.repeat(300))).toBeNull();
        expect(cleanPostUrl('')).toBeNull();
    });

    it('tells hand-marked posts from LinkedIn API posts and finds their links', () => {
        const manual = { id: 'm', platform: 'x', platform_post_id: 'https://x.com/me/status/1', published_at: '' };
        const api = { id: 'a', platform: 'linkedin', platform_post_id: 'urn:li:share:9', published_at: '' };
        const bare = { id: 'b', platform: 'other', platform_post_id: null as unknown as string, published_at: '' };
        expect(isManualRecord(manual)).toBe(true);
        expect(isManualRecord(bare)).toBe(true);
        expect(isManualRecord(api)).toBe(false);
        expect(postUrl(manual)).toBe('https://x.com/me/status/1');
        expect(postUrl(api)).toBe('https://www.linkedin.com/feed/update/urn:li:activity:9');
        expect(postUrl(bare)).toBeNull();
        expect(postPlatforms({ ...draft, published_posts: [bare] })).toEqual([]);
    });
});

describe('PostSheet', () => {
    afterEach(() => jest.restoreAllMocks());

    it('marks a post with the platform and link the writer picked', async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ connected: false }) }) as jest.Mock;
        const onMarkPosted = jest.fn().mockResolvedValue({ ok: true });
        const onClose = jest.fn();
        render(<PostSheet isOpen mode="post" draft={draft} content="Body" onClose={onClose} onMarkPosted={onMarkPosted} onLinkedInPosted={jest.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: 'X' }));
        fireEvent.change(screen.getByPlaceholderText('https://'), { target: { value: 'https://x.com/me/status/1' } });
        fireEvent.click(screen.getByRole('button', { name: 'Mark as posted' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(onMarkPosted).toHaveBeenCalledWith(expect.objectContaining({ platform: 'x', url: 'https://x.com/me/status/1' }));
        expect(screen.queryByRole('button', { name: /post to linkedin/i })).toBeNull();
    });

    it('marks a post with no details at all', async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ connected: false }) }) as jest.Mock;
        const onMarkPosted = jest.fn().mockResolvedValue({ ok: true });
        render(<PostSheet isOpen mode="post" draft={draft} content="Body" onClose={jest.fn()} onMarkPosted={onMarkPosted} onLinkedInPosted={jest.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Mark as posted' }));
        await waitFor(() => expect(onMarkPosted).toHaveBeenCalledWith(expect.objectContaining({ platform: 'other', url: undefined })));
    });

    it('offers LinkedIn posting only when LinkedIn is connected', async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ connected: true }) }) as jest.Mock;
        render(<PostSheet isOpen mode="post" draft={draft} content="Body" onClose={jest.fn()} onMarkPosted={jest.fn()} onLinkedInPosted={jest.fn()} />);
        expect(await screen.findByRole('button', { name: /post to linkedin/i })).toBeTruthy();
    });

    it('shows the server error and stays open', async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ connected: false }) }) as jest.Mock;
        const onClose = jest.fn();
        const onMarkPosted = jest.fn().mockResolvedValue({ ok: false, error: "That link doesn't look right." });
        render(<PostSheet isOpen mode="details" draft={draft} content="Body" onClose={onClose} onMarkPosted={onMarkPosted} onLinkedInPosted={jest.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(await screen.findByText("That link doesn't look right.")).toBeTruthy();
        expect(onClose).not.toHaveBeenCalled();
    });
});
