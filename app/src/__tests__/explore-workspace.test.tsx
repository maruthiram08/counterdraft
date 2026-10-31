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

        // Momentum: a fresh story several outlets picked up is rising, a year-old one is evergreen
        expect(within(details).getByText(/Early enough to be one of the first takes/)).toBeInTheDocument();
        const results = screen.getByText('Reuters · 1y ago').closest('ul')!;
        expect(within(results).getByText('Rising')).toBeInTheDocument();
        expect(within(results).getByText('Evergreen')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Async hiring' }));
        expect(await within(details).findByText('Async interviews spread among startups')).toBeInTheDocument();

        // The path keeps both searches, and going back restores the earlier results
        const path = screen.getByRole('navigation', { name: 'Exploration path' });
        fireEvent.click(within(path).getByRole('button', { name: 'remote work' }));
        expect(within(details).getByText('Companies rethink remote work policies')).toBeInTheDocument();
    });

    it('generates angles inside the story panel with the matched belief', async () => {
        render(<ExploreWorkspace />);
        search('remote work');

        const details = await screen.findByRole('region', { name: 'Story details' });
        fireEvent.click(within(details).getByRole('button', { name: /Get post ideas/ }));

        expect(await within(details).findByText(/Write it down/)).toBeInTheDocument();
        expect(within(details).getByText(/Builds on your belief/)).toBeInTheDocument();

        const call = (global.fetch as jest.Mock).mock.calls.find(([url]) => url === '/api/explore/ideas');
        expect(JSON.parse(call[1].body)).toMatchObject({
            titles: ['Companies rethink remote work policies'],
            context: 'remote work',
            relatedBeliefIds: ['b1'],
            sources: [{ title: 'Companies rethink remote work policies', summary: 'Firms are loosening office mandates.' }],
        });

        // Saving keeps the search, the source and the idea together for research and drafting
        fireEvent.click(within(details).getByRole('button', { name: 'Save to Pipeline' }));
        await waitFor(() => expect((global.fetch as jest.Mock).mock.calls.some(([url]) => url === '/api/content')).toBe(true));
        const save = (global.fetch as jest.Mock).mock.calls.find(([url]) => url === '/api/content');
        expect(JSON.parse(save[1].body).brain_metadata.explore).toMatchObject({
            query: 'remote work',
            sources: [{ title: 'Companies rethink remote work policies', url: 'https://example.com/Companies%20rethink%20remote%20work%20policies', source: 'Reuters' }],
            idea: { hook: 'Write it down', angle: 'Docs beat meetings', format: 'list' },
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

    it('starts with topics one tap away and moves the search above the results', async () => {
        render(<ExploreWorkspace />);
        expect(screen.getByRole('tab', { name: 'Technology & AI' })).toHaveAttribute('aria-selected', 'true');

        fireEvent.click(screen.getByRole('tab', { name: 'Culture & Society' }));
        feeds['remote work and office trends'] = feeds['remote work'];
        fireEvent.click(screen.getByRole('button', { name: 'Future of Work' }));

        await screen.findByRole('region', { name: 'Story details' });
        expect(screen.queryByRole('tablist', { name: 'Starting topics' })).not.toBeInTheDocument();
        expect(screen.getByPlaceholderText('Search a topic to explore...')).toBeInTheDocument();
    });

    it('leads with topics for the writer and refresh brings new categories', async () => {
        const base = global.fetch as jest.Mock;
        global.fetch = jest.fn((url: string, init?: RequestInit) => {
            if (url === '/api/explore/trends') {
                const body = JSON.parse(String(init?.body));
                const groups = body.refresh
                    ? [
                        { category: 'For you', trends: [{ label: 'Paternity leave in India', query: 'paternity leave policies India companies' }] },
                        { category: 'School admissions', trends: [{ label: 'Nursery fee hikes', query: 'nursery school fee hikes India' }] },
                    ]
                    : [
                        { category: 'For you', trends: [{ label: 'Dads and remote work', query: 'remote work new fathers' }] },
                        { category: 'Fatherhood', trends: [{ label: 'Stay-at-home dads', query: 'stay at home dads India' }] },
                    ];
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ groups }) });
            }
            return base(url, init);
        }) as unknown as typeof fetch;

        render(<ExploreWorkspace />);
        expect(await screen.findByRole('tab', { name: 'For you' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tab', { name: 'Fatherhood' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Dads and remote work' })).toBeInTheDocument();
        const firstCall = (global.fetch as jest.Mock).mock.calls.find(([url]) => url === '/api/explore/trends');
        expect(JSON.parse(firstCall[1].body)).toEqual({ mode: 'discover', taste: { more: [], less: [] } });

        // "Not for me" removes the topic now and steers the next set
        fireEvent.click(screen.getByRole('tab', { name: 'Fatherhood' }));
        fireEvent.click(screen.getByRole('button', { name: 'Not for me: Stay-at-home dads' }));
        expect(screen.queryByRole('button', { name: 'Stay-at-home dads' })).not.toBeInTheDocument();
        expect(JSON.parse(window.localStorage.getItem('cd-explore-taste')!)).toEqual({ more: [], less: ['Stay-at-home dads'] });

        fireEvent.click(screen.getByRole('button', { name: 'Show different topics' }));
        expect(await screen.findByRole('tab', { name: 'School admissions' })).toBeInTheDocument();
        expect(screen.queryByRole('tab', { name: 'Fatherhood' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Paternity leave in India' })).toBeInTheDocument();
        const refreshCall = (global.fetch as jest.Mock).mock.calls.find(([url, init]) => url === '/api/explore/trends' && JSON.parse(init.body).refresh);
        expect(JSON.parse(refreshCall[1].body)).toEqual({ mode: 'discover', refresh: true, exclude: ['Fatherhood'], taste: { more: [], less: ['Stay-at-home dads'] } });
    });

    it('searches a surprise pick and says why it fits', async () => {
        const base = global.fetch as jest.Mock;
        global.fetch = jest.fn((url: string, init?: RequestInit) => {
            if (url === '/api/explore/trends' && JSON.parse(String(init?.body)).mode === 'surprise') {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ pick: { label: 'Async hiring', query: 'async hiring', why: 'You argue for written culture; hiring is where it starts.' } }) });
            }
            return base(url, init);
        }) as unknown as typeof fetch;

        render(<ExploreWorkspace />);
        fireEvent.click(screen.getByRole('button', { name: 'Surprise me' }));

        const details = await screen.findByRole('region', { name: 'Story details' });
        expect(within(details).getByText('Async interviews spread among startups')).toBeInTheDocument();
        expect(screen.getByText(/hiring is where it starts/)).toBeInTheDocument();
        const call = (global.fetch as jest.Mock).mock.calls.find(([url, init]) => url === '/api/explore/trends' && JSON.parse(init.body).mode === 'surprise');
        expect(JSON.parse(call[1].body)).toEqual({ mode: 'surprise', taste: { more: [], less: [] }, exclude: [] });
    });

    it('shows saved topics with what is new, and opens one as a search', async () => {
        const base = global.fetch as jest.Mock;
        global.fetch = jest.fn((url: string, init?: RequestInit) => {
            if (url === '/api/explore/watch') {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ topics: [
                    { id: 'c1', title: 'Async interviews spread among startups', query: 'async hiring', newCount: 3, latest: [{ title: 'Big tech tries async interviews', url: 'https://n.com/1', source: 'N' }] },
                ] }) });
            }
            return base(url, init);
        }) as unknown as typeof fetch;

        render(<ExploreWorkspace />);
        const watching = await screen.findByRole('region', { name: "Topics you're watching" });
        expect(within(watching).getByText('3 new')).toBeInTheDocument();
        expect(within(watching).getByText('Latest: Big tech tries async interviews')).toBeInTheDocument();

        fireEvent.click(within(watching).getByRole('button', { name: /Async interviews spread among startups/ }));
        await screen.findByRole('region', { name: 'Story details' });
        expect(screen.getByText(/3 new stories on "Async interviews spread among startups" since you last looked/)).toBeInTheDocument();
        expect(Object.keys(JSON.parse(window.localStorage.getItem('cd-explore-watch-seen')!))).toEqual(['c1']);
    });

    it('answers follow-up questions about the open story from its text', async () => {
        const base = global.fetch as jest.Mock;
        global.fetch = jest.fn((url: string, init?: RequestInit) => {
            if (url === '/api/explore/ask') {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ answer: 'They cite a survey of 2,000 firms.' }) });
            }
            return base(url, init);
        }) as unknown as typeof fetch;

        render(<ExploreWorkspace />);
        search('remote work');
        const details = await screen.findByRole('region', { name: 'Story details' });
        const chat = within(details).getByRole('region', { name: 'Ask about this story' });
        fireEvent.change(within(chat).getByLabelText('Your question about this story'), { target: { value: 'What evidence do they give?' } });
        fireEvent.click(within(chat).getByRole('button', { name: 'Ask' }));

        expect(await within(chat).findByText('They cite a survey of 2,000 firms.')).toBeInTheDocument();
        expect(within(chat).getByText('What evidence do they give?')).toBeInTheDocument();
        const call = (global.fetch as jest.Mock).mock.calls.find(([url]) => url === '/api/explore/ask');
        expect(JSON.parse(call[1].body)).toMatchObject({
            url: 'https://example.com/Companies%20rethink%20remote%20work%20policies',
            question: 'What evidence do they give?',
            history: [],
            query: 'remote work',
        });
    });

    it('asks for ideas from the stance and platform the writer picked, and remembers them', async () => {
        render(<ExploreWorkspace />);
        search('remote work');
        const details = await screen.findByRole('region', { name: 'Story details' });

        const stance = within(details).getByRole('radiogroup', { name: 'Your stance' });
        expect(within(stance).getByRole('radio', { name: 'Any' })).toHaveAttribute('aria-checked', 'true');
        fireEvent.click(within(stance).getByRole('radio', { name: 'Push back' }));
        fireEvent.click(within(within(details).getByRole('radiogroup', { name: 'Write for' })).getByRole('radio', { name: 'Newsletter' }));
        fireEvent.click(within(details).getByRole('button', { name: /Get post ideas/ }));

        await within(details).findByText(/Write it down/);
        const call = (global.fetch as jest.Mock).mock.calls.find(([url]) => url === '/api/explore/ideas');
        expect(JSON.parse(call[1].body)).toMatchObject({ stance: 'push_back', platform: 'newsletter' });
        expect(JSON.parse(window.localStorage.getItem('cd-explore-idea-prefs')!)).toEqual({ stance: 'push_back', platform: 'newsletter' });
    });

    it('says when the writer covered the topic before and offers a follow-up', async () => {
        const base = global.fetch as jest.Mock;
        global.fetch = jest.fn((url: string, init?: RequestInit) => {
            if (url === '/api/explore/history') {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ history: {
                    before: { id: 'p1', kind: 'post', date: '2026-03-12T10:00:00Z', gist: 'Docs beat meetings.', changed: 'Firms are now loosening office mandates.' },
                    newGround: false,
                } }) });
            }
            return base(url, init);
        }) as unknown as typeof fetch;

        render(<ExploreWorkspace />);
        search('remote work');
        const followUp = await screen.findByRole('button', { name: /You wrote on this in March/ });
        fireEvent.click(followUp);

        const details = screen.getByRole('region', { name: 'Story details' });
        expect(within(details).getByText('Docs beat meetings.')).toBeInTheDocument();
        fireEvent.click(within(details).getByRole('button', { name: /Get post ideas/ }));
        await within(details).findByText(/Write it down/);
        const call = (global.fetch as jest.Mock).mock.calls.find(([url]) => url === '/api/explore/ideas');
        expect(JSON.parse(call[1].body).context).toContain('A follow-up to the writer');
    });

    it('tunes For you from a story with More like this and Not for me', async () => {
        render(<ExploreWorkspace />);
        search('remote work');

        const details = await screen.findByRole('region', { name: 'Story details' });
        const more = within(details).getByRole('button', { name: 'More like this' });
        fireEvent.click(more);
        expect(more).toHaveAttribute('aria-pressed', 'true');
        expect(JSON.parse(window.localStorage.getItem('cd-explore-taste')!).more).toEqual(['Companies rethink remote work policies']);

        // Changing your mind moves it across, and the story leaves the results
        fireEvent.click(within(details).getByRole('button', { name: 'Not for me' }));
        expect(JSON.parse(window.localStorage.getItem('cd-explore-taste')!)).toEqual({ more: [], less: ['Companies rethink remote work policies'] });
        expect(screen.queryByText('Companies rethink remote work policies')).not.toBeInTheDocument();
        expect(within(details).getByText('Office leases hit a record low')).toBeInTheDocument();
    });

    it('shows what people ask about a search and gets ideas for a question', async () => {
        const base = global.fetch as jest.Mock;
        global.fetch = jest.fn((url: string, init?: RequestInit) => {
            if (url.startsWith('/api/explore/questions')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ questions: [
                    { question: 'How do you keep a remote team aligned without daily calls?', theme: 'Staying aligned', url: 'https://www.reddit.com/r/remotework/1', source: 'Reddit', detail: 'Our team is spread over 4 time zones.' },
                    { question: 'Is async standup worth it for a team of five?', theme: 'Staying aligned', url: 'https://www.quora.com/async-standup', source: 'Quora' },
                    { question: 'How do I ask my manager for full remote?', theme: 'Negotiating remote', url: 'https://www.reddit.com/r/cscareers/2', source: 'Reddit' },
                ] }) });
            }
            return base(url, init);
        }) as unknown as typeof fetch;

        render(<ExploreWorkspace />);
        search('remote work');

        await screen.findByRole('tab', { name: /Questions people ask \(3\)/ });
        expect(screen.getByRole('tab', { name: 'Stories (2)' })).toHaveAttribute('aria-selected', 'true');

        // The top questions show above the stories, with a way to see them all
        expect(screen.getByText('People are asking')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Is async standup worth it/ })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /See all 3 questions/ }));
        expect(screen.getByRole('tab', { name: /Questions people ask/ })).toHaveAttribute('aria-selected', 'true');

        expect(screen.getByRole('heading', { name: 'Staying aligned' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Negotiating remote' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /keep a remote team aligned/ }));

        const details = screen.getByRole('region', { name: 'Story details' });
        expect(within(details).getByRole('heading', { name: 'How do you keep a remote team aligned without daily calls?' })).toBeInTheDocument();
        expect(within(details).getByText('Our team is spread over 4 time zones.')).toBeInTheDocument();
        expect(within(details).getByRole('link', { name: /Read the discussion on Reddit/ })).toHaveAttribute('href', 'https://www.reddit.com/r/remotework/1');

        fireEvent.click(within(details).getByRole('button', { name: /Get post ideas/ }));
        await within(details).findByText('Docs beat meetings');
        const ideasCall = (global.fetch as jest.Mock).mock.calls.find(([url]) => url === '/api/explore/ideas');
        expect(JSON.parse(ideasCall[1].body).titles).toEqual(['How do you keep a remote team aligned without daily calls?']);
    });

    it('reads the open story and briefs the writer, and feeds that into ideas', async () => {
        const base = global.fetch as jest.Mock;
        global.fetch = jest.fn((url: string, init?: RequestInit) => {
            if (url === '/api/explore/deep-dive') {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ dive: {
                    summary: 'Large firms are letting teams set their own office days.',
                    keyPoints: ['Office attendance is flat at 3 days a week.', 'Two banks dropped mandates in March.'],
                    viewpoints: [{ who: 'Landlords', view: 'Mandates will return within a year.' }],
                    openQuestions: ['Who gets promoted in a hybrid team?'],
                } }) });
            }
            return base(url, init);
        }) as unknown as typeof fetch;

        render(<ExploreWorkspace />);
        search('remote work');

        const details = await screen.findByRole('region', { name: 'Story details' });
        expect(await within(details).findByText('Large firms are letting teams set their own office days.')).toBeInTheDocument();
        expect(within(details).getByText('Two banks dropped mandates in March.')).toBeInTheDocument();
        expect(within(details).getByText('Mandates will return within a year.')).toBeInTheDocument();
        const call = (global.fetch as jest.Mock).mock.calls.find(([url]) => url === '/api/explore/deep-dive');
        expect(JSON.parse(call[1].body)).toMatchObject({ url: 'https://example.com/Companies%20rethink%20remote%20work%20policies', query: 'remote work' });

        fireEvent.click(within(details).getByRole('button', { name: /Get post ideas/ }));
        await within(details).findByText('Docs beat meetings');
        const ideasCall = (global.fetch as jest.Mock).mock.calls.find(([url]) => url === '/api/explore/ideas');
        expect(JSON.parse(ideasCall[1].body).sources[0].summary).toContain('Two banks dropped mandates in March.');

        // An open question becomes the next step of the exploration
        feeds['Who gets promoted in a hybrid team?'] = { feed: [story('Promotion gaps in hybrid teams')], related: [] };
        fireEvent.click(within(details).getByRole('button', { name: /Who gets promoted in a hybrid team/ }));
        expect(await within(details).findByText('Promotion gaps in hybrid teams')).toBeInTheDocument();
    });

        it('saves a topic with a note to the Pipeline before any idea is picked', async () => {
        render(<ExploreWorkspace />);
        search('remote work');

        const details = await screen.findByRole('region', { name: 'Story details' });
        fireEvent.click(within(details).getByRole('button', { name: 'Save topic' }));
        fireEvent.change(within(details).getByLabelText(/Why keep this/), { target: { value: 'Pair with my take on written culture' } });
        fireEvent.click(within(details).getByRole('button', { name: /Save to Pipeline/ }));

        expect(await within(details).findByText('Topic saved')).toBeInTheDocument();
        const save = (global.fetch as jest.Mock).mock.calls.find(([url]) => url === '/api/content');
        const body = JSON.parse(save[1].body);
        expect(body).toMatchObject({ hook: 'Companies rethink remote work policies', angle: 'Pair with my take on written culture', stage: 'idea', source_type: 'explore' });
        expect(body.brain_metadata.explore).toMatchObject({ query: 'remote work', savedAs: 'topic', note: 'Pair with my take on written culture' });
        expect(body.brain_metadata.explore.idea).toBeUndefined();
    });

        it('maps the takes so far and gets ideas for the missing one', async () => {
        feeds['ai tutors'] = {
            feed: [story('Schools ban chatbots'), story('Districts restrict AI'), story('AI tutor lifts maths scores')],
            related: [],
        };
        const base = global.fetch as jest.Mock;
        global.fetch = jest.fn((url: string, init?: RequestInit) => {
            if (url === '/api/explore/debate') {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ debate: {
                    takes: [{ take: 'Schools are restricting chatbots', stories: [0, 1] }, { take: 'AI tutors raise scores', stories: [2] }],
                    gap: { take: 'Nobody asks what teachers stop doing', why: 'Coverage is all about students.' },
                } }) });
            }
            return base(url, init);
        }) as unknown as typeof fetch;

        render(<ExploreWorkspace />);
        search('ai tutors');

        // The takes fold away so the stories come first
        const takesToggle = await screen.findByRole('button', { name: /The takes so far/ });
        expect(takesToggle).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByText('Schools are restricting chatbots')).not.toBeInTheDocument();
        fireEvent.click(takesToggle);
        expect(screen.getByText('Schools are restricting chatbots')).toBeInTheDocument();
        expect(screen.getByText('2 stories')).toBeInTheDocument();
        const debateCall = (global.fetch as jest.Mock).mock.calls.find(([url]) => url === '/api/explore/debate');
        expect(JSON.parse(debateCall[1].body).stories).toHaveLength(3);

        fireEvent.click(screen.getByRole('button', { name: /Get ideas for this angle/ }));
        const details = screen.getByRole('region', { name: 'Story details' });
        expect(within(details).getByRole('heading', { name: 'Nobody asks what teachers stop doing' })).toBeInTheDocument();
        fireEvent.click(within(details).getByRole('button', { name: /Get post ideas/ }));
        await within(details).findByText('Docs beat meetings');
        const ideasCall = (global.fetch as jest.Mock).mock.calls.find(([url]) => url === '/api/explore/ideas');
        expect(JSON.parse(ideasCall[1].body).context).toBe('ai tutors. The angle to take, which the coverage is missing: Nobody asks what teachers stop doing');
    });

        it('shows every story behind a take when it is picked', async () => {
        feeds['ai tutors'] = {
            feed: [story('Schools ban chatbots'), story('AI tutor lifts maths scores'), story('Districts restrict AI')],
            related: [],
        };
        const base = global.fetch as jest.Mock;
        global.fetch = jest.fn((url: string, init?: RequestInit) => {
            if (url === '/api/explore/debate') {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ debate: {
                    takes: [{ take: 'Schools are restricting chatbots', stories: [0, 2] }, { take: 'AI tutors raise scores', stories: [1] }],
                    gap: null,
                } }) });
            }
            return base(url, init);
        }) as unknown as typeof fetch;

        render(<ExploreWorkspace />);
        search('ai tutors');

        fireEvent.click(await screen.findByRole('button', { name: /The takes so far/ }));
        fireEvent.click(screen.getByRole('button', { name: /Schools are restricting chatbots/ }));

        const list = screen.getByRole('region', { name: 'Stories' });
        expect(within(list).getByText('2 stories say')).toBeInTheDocument();
        expect(within(list).getByRole('button', { name: /Schools ban chatbots/ })).toBeInTheDocument();
        expect(within(list).getByRole('button', { name: /Districts restrict AI/ })).toBeInTheDocument();
        expect(within(list).queryByRole('button', { name: /AI tutor lifts maths scores/ })).not.toBeInTheDocument();
        expect(within(screen.getByRole('region', { name: 'Story details' })).getByRole('heading', { name: 'Schools ban chatbots' })).toBeInTheDocument();

        fireEvent.click(within(list).getByRole('button', { name: 'Show all 3' }));
        expect(within(list).getByRole('button', { name: /AI tutor lifts maths scores/ })).toBeInTheDocument();
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
