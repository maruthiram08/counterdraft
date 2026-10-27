import { render, screen, fireEvent } from '@testing-library/react';
import { PublishedPostsList, postPlatforms } from '@/components/editor/PublishedPostsList';
import type { Draft } from '@/types';

const base: Draft = {
    id: 'd1',
    belief_text: 'South Florida is changing',
    content: 'Body text',
    status: 'published',
    created_at: '2026-10-26T10:00:00Z',
    updated_at: '2026-10-26T18:02:00Z',
};

describe('postPlatforms', () => {
    it('uses publish records first', () => {
        expect(postPlatforms({ ...base, labels: { platform: 'medium' }, published_posts: [{ id: 'p', platform: 'linkedin', platform_post_id: 'urn:li:share:1', published_at: base.updated_at }] })).toEqual(['LinkedIn']);
    });
    it('falls back to the platform the post was written for', () => {
        expect(postPlatforms({ ...base, labels: { platform: 'x' } })).toEqual(['X']);
    });
    it('says nothing when the platform is unknown', () => {
        expect(postPlatforms(base)).toEqual([]);
    });
});

describe('PublishedPostsList', () => {
    it('opens a post when tapped and never says "Unknown platform"', () => {
        const onOpen = jest.fn();
        render(<PublishedPostsList drafts={[base]} onOpen={onOpen} />);
        expect(screen.queryByText(/unknown platform/i)).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /open south florida/i }));
        expect(onOpen).toHaveBeenCalledWith('d1');
    });

    it('a live post link does not also open the post', () => {
        const onOpen = jest.fn();
        render(<PublishedPostsList drafts={[{ ...base, published_posts: [{ id: 'p', platform: 'linkedin', platform_post_id: 'urn:li:share:42', published_at: base.updated_at }] }]} onOpen={onOpen} />);
        const link = screen.getByRole('link', { name: /view on linkedin/i });
        expect(link.getAttribute('href')).toBe('https://www.linkedin.com/feed/update/urn:li:activity:42');
        fireEvent.click(link);
        expect(onOpen).not.toHaveBeenCalled();
    });
});
