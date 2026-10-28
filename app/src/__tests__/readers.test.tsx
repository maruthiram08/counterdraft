import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { openingVotes, parseReaderPanel, quotedFrom } from '@/lib/editor/readers'
import { ReaderPanel } from '@/components/editor/ReaderPanel'
import { HookLab } from '@/components/editor/HookLab'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const post = `Most hiring advice is written for big companies.\n\n${'Startups hire differently and the advice does not fit them at all. '.repeat(3)}`

describe('parseReaderPanel', () => {
    it('keeps well-formed readers, drops repeats and lines that are not in the post', () => {
        const result = parseReaderPanel({
            readers: [
                { name: 'Priya', who: 'Founder', readsOn: true, reaction: 'Finally someone says it.', comment: 'Agree.', lostAt: 'Startups hire differently', opens: [0, 2, 9] },
                { name: 'priya', who: 'Duplicate', readsOn: false, reaction: 'Again' },
                { name: 'Sam', who: 'Recruiter', readsOn: 'yes', reaction: '"Meh."', lostAt: 'A line the model made up entirely' },
                { name: 'No reaction', who: 'x' },
            ],
        }, post, 3)
        expect(result.readers.map(r => r.name)).toEqual(['Priya', 'Sam'])
        expect(result.readers[0]).toMatchObject({ readsOn: true, lostAt: 'Startups hire differently', opens: [0, 2] })
        expect(result.readers[1]).toMatchObject({ readsOn: false, reaction: 'Meh.', lostAt: '', opens: [] })
    })

    it('keeps quote marks that open a quoted phrase', () => {
        const result = parseReaderPanel({ readers: [{ name: 'M', who: '', reaction: '"Ever" is doing a lot of work.' }] }, post)
        expect(result.readers[0].reaction).toBe('"Ever" is doing a lot of work.')
    })

    it('copes with junk', () => {
        expect(parseReaderPanel(null, post)).toEqual({ readers: [] })
        expect(parseReaderPanel({ readers: 'no' }, post)).toEqual({ readers: [] })
    })

    it('matches quotes despite case, spacing and quote marks', () => {
        expect(quotedFrom(post, '"most HIRING advice  is written"')).toBe(true)
        expect(quotedFrom(post, 'short')).toBe(false)
    })

    it('counts reader votes per opening', () => {
        const panel = parseReaderPanel({ readers: [
            { name: 'A', who: '', reaction: 'x', opens: [0, 1] },
            { name: 'B', who: '', reaction: 'y', opens: [1] },
        ] }, post, 3)
        expect(openingVotes(panel, 3)).toEqual([1, 2, 0])
    })
})

describe('ReaderPanel', () => {
    afterEach(() => jest.restoreAllMocks())

    it('asks the readers, shows how many read on, and re-asks the same readers', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ readers: [
                { name: 'Priya', who: 'Founder', readsOn: true, reaction: 'Finally.', comment: 'So true', lostAt: '', opens: [] },
                { name: 'Sam', who: 'Recruiter', readsOn: false, reaction: 'Not for me.', comment: '', lostAt: 'Startups hire differently', opens: [] },
            ] }),
        }) as unknown as typeof fetch
        render(<ReaderPanel content={post} />)

        fireEvent.click(screen.getByText('Ask readers'))
        await waitFor(() => expect(screen.getByText('1 of 2')).toBeInTheDocument())
        expect(screen.getByText('Reads on')).toBeInTheDocument()
        expect(screen.getByText('Scrolls past')).toBeInTheDocument()
        expect(screen.getByText(/not a forecast of reach/)).toBeInTheDocument()

        fireEvent.click(screen.getByText('Ask them again'))
        await waitFor(() => expect((global.fetch as jest.Mock).mock.calls.length).toBe(2))
        const body = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body)
        expect(body.readers).toEqual([{ name: 'Priya', who: 'Founder' }, { name: 'Sam', who: 'Recruiter' }])
    })
})

describe('HookLab with readers', () => {
    afterEach(() => jest.restoreAllMocks())

    it('asks readers which openings they would open and shows the votes', async () => {
        global.fetch = jest.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ current: null, options: [{ style: 'Bold claim', text: 'Startup hiring advice is broken.', why: '', rating: 4 }] }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ readers: [
                    { name: 'A', who: '', readsOn: true, reaction: 'x', comment: '', lostAt: '', opens: [1] },
                    { name: 'B', who: '', readsOn: true, reaction: 'y', comment: '', lostAt: '', opens: [0, 1] },
                ] }),
            }) as unknown as typeof fetch
        render(<HookLab content={post} onApply={jest.fn()} />)

        fireEvent.click(screen.getByText('Try 3 other openings'))
        await waitFor(() => screen.getByText('Startup hiring advice is broken.'))
        fireEvent.click(screen.getByText("Ask readers which they'd open"))
        await waitFor(() => expect(screen.getByText(/2 of 2 readers/)).toBeInTheDocument())
        expect(screen.getByText(/1 of 2 readers/)).toBeInTheDocument()
        const body = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body)
        expect(body.openings).toEqual(['Most hiring advice is written for big companies.', 'Startup hiring advice is broken.'])
    })
})
