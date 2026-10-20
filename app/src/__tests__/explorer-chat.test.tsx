import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExplorerChat } from '@/components/explore/ExplorerChat';

jest.mock('sonner', () => ({ toast: { success: jest.fn() } }));

const feedResponse = {
    feed: [{
        title: 'Companies rethink remote work policies',
        sourceUrl: 'https://example.com/a',
        source: 'Reuters',
        category: 'remote work',
        publishedAt: new Date(Date.now() - 3 * 3_600_000).toISOString(),
        summary: 'Firms are loosening office mandates.',
        sourceCount: 3,
        otherSources: ['The Verge', 'Wired'],
        relatedBeliefId: 'b1',
        relatedBelief: 'Remote teams need a strong written culture',
        type: 'article',
    }],
    related: [{ label: 'Async hiring', query: 'async hiring' }],
};

describe('ExplorerChat', () => {
    beforeEach(() => {
        window.localStorage.clear();
        Element.prototype.scrollIntoView = jest.fn();
        global.fetch = jest.fn((url: string) => Promise.resolve({
            ok: true,
            json: () => Promise.resolve(url.startsWith('/api/explore/feed') ? feedResponse : { groups: [] }),
        })) as unknown as typeof fetch;
    });

    it('shows story context, the belief match and related topics, and keeps them across remounts', async () => {
        const { unmount } = render(<ExplorerChat />);

        fireEvent.change(screen.getByPlaceholderText('Ask about any topic...'), { target: { value: 'remote work' } });
        fireEvent.submit(screen.getByPlaceholderText('Ask about any topic...').closest('form')!);

        expect(await screen.findByText('Companies rethink remote work policies')).toBeInTheDocument();
        expect(screen.getByText('Reuters · 2 more outlets · 3h ago')).toBeInTheDocument();
        expect(screen.getByText('Firms are loosening office mandates.')).toBeInTheDocument();
        expect(screen.getByText(/Touches your belief/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Async hiring' })).toBeInTheDocument();

        unmount();
        render(<ExplorerChat />);
        await waitFor(() => expect(screen.getByText('Companies rethink remote work policies')).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: /New/ }));
        expect(screen.getByText('What would you like to explore?')).toBeInTheDocument();
    });

    it('sends platform, tone and matched beliefs when generating ideas', async () => {
        render(<ExplorerChat />);
        fireEvent.change(screen.getByLabelText('Tone for post ideas'), { target: { value: 'educational' } });
        fireEvent.change(screen.getByPlaceholderText('Ask about any topic...'), { target: { value: 'remote work' } });
        fireEvent.submit(screen.getByPlaceholderText('Ask about any topic...').closest('form')!);

        fireEvent.click(await screen.findByRole('button', { name: /Give me post ideas/ }));

        await waitFor(() => {
            const call = (global.fetch as jest.Mock).mock.calls.find(([url]) => url === '/api/explore/ideas');
            expect(call).toBeDefined();
            expect(JSON.parse(call[1].body)).toMatchObject({
                platform: 'linkedin',
                tone: 'educational',
                relatedBeliefIds: ['b1'],
            });
        });
    });
});
