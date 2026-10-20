import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ExploreWorkspace } from '@/components/explore/ExploreWorkspace';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const story = (title: string, extra = {}) => ({
    title,
    sourceUrl: `https://example.com/${encodeURIComponent(title)}`,
    source: 'Reuters',
    category: 'q',
    type: 'article',
    ...extra,
});

const feeds: Record<string, unknown> = {
    'remote work': {
        feed: [
            story('Companies rethink remote work policies', {
                publishedAt: new Date(Date.now() - 3 * 3_600_000).toISOString(),
                summary: 'Firms are loosening office mandates.',
                sourceCount: 3,
                otherSources: ['The Verge', 'Wired'],
                relatedBeliefId: 'b1',
                relatedBelief: 'Remote teams need a strong written culture',
                beliefStance: 'supports',
            }),
            story('Office leases hit a record low', { publishedAt: new Date(Date.now() - 400 * 86_400_000).toISOString() }),
        ],
        related: [{ label: 'Async hiring', query: 'async hiring' }],
    },
    'async hiring': {
        feed: [story('Async interviews spread among startups')],
        related: [],
    },
};

function mockFetch() {
    global.fetch = jest.fn((url: string) => {
        let body: unknown = { groups: [] };
        if (url.startsWith('/api/explore/feed')) {
            const q = new URL(url, 'http://x').searchParams.get('q') || '';
            body = feeds[q];
        } else if (url === '/api/explore/ideas') {
            body = { ideas: [{ hook: 'Write it down', angle: 'Docs beat meetings', format: 'list', belief: 'Remote teams need a strong written culture' }] };
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
    }) as unknown as typeof fetch;
}

function search(text: string) {
    const input = screen.getByPlaceholderText('Search a topic to explore...');
    fireEvent.change(input, { target: { value: text } });
    fireEvent.submit(input.closest('form')!);
}

describe('ExploreWorkspace', () => {
    beforeEach(() => {
        window.localStorage.clear();
        mockFetch();
    });

    it('shows the first story in the panel with its context, and branches into related topics', async () => {
        render(<ExploreWorkspace />);
        search('remote work');

        const details = await screen.findByRole('region', { name: 'Story details' });
        expect(within(details).getByText('Companies rethink remote work policies')).toBeInTheDocument();
        expect(within(details).getByText('Reuters · 2 more outlets · 3h ago')).toBeInTheDocument();
        expect(within(details).getByText('Firms are loosening office mandates.')).toBeInTheDocument();
        expect(within(details).getByText(/Supports your belief/)).toBeInTheDocument();

        // Old items read as relative dates like everything else
        expect(screen.getByText('Reuters · 1y ago')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Async hiring' }));
        expect(await within(details).findByText('Async interviews spread among startups')).toBeInTheDocument();

        // The path keeps both searches, and going back restores the earlier results
        const path = screen.getByRole('navigation', { name: 'Exploration path' });
        fireEvent.click(within(path).getByRole('button', { name: 'remote work' }));
        expect(within(details).getByText('Companies rethink remote work policies')).toBeInTheDocument();
    });

    it('generates angles inside the story panel with platform, tone and the matched belief', async () => {
        render(<ExploreWorkspace />);
        fireEvent.change(screen.getByLabelText('Tone for post ideas'), { target: { value: 'educational' } });
        search('remote work');

        const details = await screen.findByRole('region', { name: 'Story details' });
        fireEvent.click(within(details).getByRole('button', { name: /Get LinkedIn post ideas/ }));

        expect(await within(details).findByText(/Write it down/)).toBeInTheDocument();
        expect(within(details).getByText(/Builds on your belief/)).toBeInTheDocument();

        const call = (global.fetch as jest.Mock).mock.calls.find(([url]) => url === '/api/explore/ideas');
        expect(JSON.parse(call[1].body)).toMatchObject({
            titles: ['Companies rethink remote work policies'],
            context: 'remote work',
            platform: 'linkedin',
            tone: 'educational',
            relatedBeliefIds: ['b1'],
        });
    });

    it('names a long search by its short label and shows what each result offers', async () => {
        feeds['How to develop GTM strategy for B2C product as a product strategy'] = {
            label: 'B2C go-to-market strategy',
            intent: 'learn',
            feed: [story('How Duolingo found its first million users', {
                kind: 'case study',
                takeaway: 'Duolingo grew through a free core product and app-store featuring before paid channels.',
            })],
            related: [],
        };
        render(<ExploreWorkspace />);
        search('How to develop GTM strategy for B2C product as a product strategy');

        const details = await screen.findByRole('region', { name: 'Story details' });
        expect(within(details).getByText('What you can use')).toBeInTheDocument();
        expect(within(details).getByText(/free core product/)).toBeInTheDocument();
        const path = screen.getByRole('navigation', { name: 'Exploration path' });
        expect(within(path).getByRole('button', { name: 'B2C go-to-market strategy' })).toBeInTheDocument();
    });

    it('restores the exploration after a remount and starts over with New', async () => {
        const { unmount } = render(<ExploreWorkspace />);
        search('remote work');
        await screen.findByRole('region', { name: 'Story details' });
        unmount();

        render(<ExploreWorkspace />);
        await waitFor(() => expect(screen.getByRole('navigation', { name: 'Exploration path' })).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: /New/ }));
        expect(screen.getByText('What would you like to explore?')).toBeInTheDocument();
    });
});
