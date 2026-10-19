import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StrategyBar } from '@/components/editor/StrategyBar'
import { BrainMetadata, Draft } from '@/types'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const baseDraft = (meta?: Partial<BrainMetadata>): Draft & { hook?: string } => ({
    id: 'd1',
    belief_text: '',
    content: '',
    status: 'draft',
    created_at: '',
    updated_at: '',
    hook: 'Hiring your first PM',
    brain_metadata: meta as BrainMetadata,
})

describe('StrategyBar', () => {
    afterEach(() => jest.restoreAllMocks())

    it('saves a free-text goal typed into a field', async () => {
        const onUpdate = jest.fn().mockResolvedValue(undefined)
        render(<StrategyBar draft={baseDraft({ stance: 'contrarian' })} onUpdate={onUpdate} />)

        fireEvent.click(screen.getByTitle('Add goal'))
        const input = screen.getByPlaceholderText('What should this post achieve?')
        fireEvent.change(input, { target: { value: 'Get three founders to DM me' } })
        fireEvent.keyDown(input, { key: 'Enter' })

        await waitFor(() => expect(onUpdate).toHaveBeenCalled())
        expect(onUpdate.mock.calls[0][0].brain_metadata).toMatchObject({ outcome: 'Get three founders to DM me', stance: 'contrarian' })
    })

    it('sends the brief to the parser and merges the result', async () => {
        const onUpdate = jest.fn().mockResolvedValue(undefined)
        const fetchMock = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ audience: { role: 'First-time founders', pain: 'Fear of hiring' }, cta: 'DM me' }),
        })
        global.fetch = fetchMock as unknown as typeof fetch

        render(<StrategyBar draft={baseDraft({ stance: 'contrarian' })} onUpdate={onUpdate} />)

        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'For founders scared of hiring a PM. Nudge them to DM me.' } })
        fireEvent.click(screen.getByText('Shape strategy'))

        await waitFor(() => expect(onUpdate).toHaveBeenCalled())
        const body = JSON.parse(fetchMock.mock.calls[0][1].body)
        expect(body).toMatchObject({ action: 'parse_brief', brief: 'For founders scared of hiring a PM. Nudge them to DM me.' })
        expect(onUpdate.mock.calls.at(-1)[0].brain_metadata).toMatchObject({
            stance: 'contrarian',
            cta: 'DM me',
            brief: 'For founders scared of hiring a PM. Nudge them to DM me.',
            audience: { role: 'First-time founders' },
        })
    })
})
