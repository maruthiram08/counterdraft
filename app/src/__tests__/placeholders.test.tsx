import { render, screen, fireEvent } from '@testing-library/react'
import { findPlaceholders, markPlaceholders } from '@/lib/editor/placeholders'
import { generateHighlights } from '@/lib/editor/markdown'
import { PlaceholderNotice } from '@/components/editor/PlaceholderNotice'

const draft = 'Opening line.\n\nThe sky lit up. [Insert personal anecdote about a natural event]\n\nSee [the study](https://x.y) and [add your own example].'

describe('findPlaceholders', () => {
    it('finds bracketed spots and skips markdown links', () => {
        const found = findPlaceholders(draft)
        expect(found.map(p => p.label)).toEqual(['Insert personal anecdote about a natural event', 'add your own example'])
        expect(draft.slice(found[0].start, found[0].end)).toBe('[Insert personal anecdote about a natural event]')
    })

    it('ignores short brackets and ones spanning lines', () => {
        expect(findPlaceholders('[1] and [a\nb] and [ok]')).toEqual([])
    })
})

describe('markPlaceholders', () => {
    it('marks each placeholder and escapes the rest without moving text', () => {
        const html = markPlaceholders('a < b [add a number here] end\n')
        expect(html).toContain('a &lt; b <mark data-placeholder="0"')
        expect(html).toContain('>[add a number here]</mark> end')
        expect(html.endsWith('<br/>&nbsp;')).toBe(true)
    })

    it('feeds the editor backdrop even with no fact-check results', () => {
        expect(generateHighlights('No spots here.', null, [])).toBeNull()
        expect(generateHighlights(draft, null, [])).toContain('data-placeholder="1"')
    })
})

describe('PlaceholderNotice', () => {
    it('lists the spots and jumps to the one picked', () => {
        const onJump = jest.fn()
        render(<PlaceholderNotice placeholders={findPlaceholders(draft)} onJump={onJump} />)
        expect(screen.getByText('2 spots need your own words before you post')).toBeInTheDocument()
        fireEvent.click(screen.getAllByText('Go to it')[1])
        expect(onJump.mock.calls[0][0].label).toBe('add your own example')
    })

    it('renders nothing when the draft is complete', () => {
        const { container } = render(<PlaceholderNotice placeholders={[]} onJump={jest.fn()} />)
        expect(container).toBeEmptyDOMElement()
    })
})
