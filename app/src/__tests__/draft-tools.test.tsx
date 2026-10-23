import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { paragraphAt, parseOutlineShapes, parseVariants, replaceRange } from '@/lib/editor/draft-tools'
import { VariantsPanel } from '@/components/editor/VariantsPanel'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const post = 'First line.\nStill first.\n\nSecond paragraph here.\n\n\nThird one.'

describe('paragraphAt', () => {
    it('finds the paragraph around the caret', () => {
        expect(paragraphAt(post, 3)?.text).toBe('First line.\nStill first.')
        expect(paragraphAt(post, post.indexOf('paragraph'))?.text).toBe('Second paragraph here.')
        expect(paragraphAt(post, post.length)?.text).toBe('Third one.')
    })

    it('falls back to the paragraph before a blank line, and is null for an empty draft', () => {
        const blank = post.indexOf('\n\n\n') + 2
        expect(paragraphAt(post, blank)?.text).toBe('Second paragraph here.')
        expect(paragraphAt('   ', 0)).toBeNull()
    })

    it('gives positions that replaceRange can swap', () => {
        const p = paragraphAt(post, post.indexOf('Second'))!
        expect(replaceRange(post, p.start, p.end, 'New middle.')).toBe('First line.\nStill first.\n\nNew middle.\n\n\nThird one.')
    })
})

describe('parseOutlineShapes', () => {
    it('keeps up to two shapes with names and at least two sections, unlike the current outline', () => {
        const shapes = parseOutlineShapes({
            shapes: [
                { name: 'Story', why: 'Warmer', sections: ['Scene: the night sky', 'Lesson: cycles'] },
                { name: 'Same as now', sections: ['A', 'B'] },
                { name: 'Too thin', sections: ['Only one'] },
                { name: 'Myth vs reality', sections: ['Myth: ...', 'Reality: ...', 'So what: ...'] },
                { name: 'Third valid', sections: ['x: 1', 'y: 2'] },
            ],
        }, ['A', 'B'])
        expect(shapes.map(s => s.name)).toEqual(['Story', 'Myth vs reality'])
    })

    it('copes with junk', () => {
        expect(parseOutlineShapes('nope')).toEqual([])
    })
})

describe('parseVariants', () => {
    it('keeps non-empty variants that differ from the draft, in a fixed order', () => {
        expect(parseVariants({ personal: 'Me, at night.', shorter: 'Short.', punchier: 'Original' }, 'Original'))
            .toEqual([{ kind: 'shorter', text: 'Short.' }, { kind: 'personal', text: 'Me, at night.' }])
    })
})

describe('VariantsPanel', () => {
    afterEach(() => jest.restoreAllMocks())

    it('asks for variants, swaps one in, and goes back to the draft', async () => {
        const draft = 'A draft long enough to vary. '.repeat(4)
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ variants: [{ kind: 'shorter', text: 'A short draft.' }, { kind: 'punchier', text: 'Punchy.' }] }),
        }) as unknown as typeof fetch
        const onApply = jest.fn()
        const { rerender } = render(<VariantsPanel content={draft} onApply={onApply} />)

        fireEvent.click(screen.getByText('Make variants'))
        await waitFor(() => screen.getByText('A short draft.'))
        expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)).toMatchObject({ action: 'variants', draft })
        expect(screen.getByText('Shorter')).toBeInTheDocument()

        fireEvent.click(screen.getAllByText('Use this')[0])
        expect(onApply).toHaveBeenLastCalledWith('A short draft.')

        rerender(<VariantsPanel content="A short draft." onApply={onApply} />)
        fireEvent.click(screen.getByText('Back to my draft'))
        expect(onApply).toHaveBeenLastCalledWith(draft)
    })
})
