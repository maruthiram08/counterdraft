import { render, screen, fireEvent } from '@testing-library/react'
import { extractSuggestions, findSuggestions, liveSuggestions, wrapSuggestions } from '@/lib/editor/suggestions'
import { markPlaceholders } from '@/lib/editor/placeholders'
import { SuggestionNotice } from '@/components/editor/SuggestionNotice'
import { PlaceholderNotice } from '@/components/editor/PlaceholderNotice'
import { findPlaceholders } from '@/lib/editor/placeholders'

const raw = 'A hook.\n\n<suggested>When India won in 2011, our office stopped to watch.</suggested>\n\nThe point. <SUGGESTED> A client asked me why. </suggested> End.</suggested>'

describe('extractSuggestions', () => {
    it('strips the tags, keeps the text and lists each suggestion', () => {
        const { text, suggestions } = extractSuggestions(raw)
        expect(text).toBe('A hook.\n\nWhen India won in 2011, our office stopped to watch.\n\nThe point. A client asked me why. End.')
        expect(suggestions).toEqual(['When India won in 2011, our office stopped to watch.', 'A client asked me why.'])
    })
})

describe('findSuggestions', () => {
    it('finds the suggestions still in the draft and drops edited ones', () => {
        const { text, suggestions } = extractSuggestions(raw)
        const edited = text.replace('A client asked me why.', 'My manager asked me why.')
        const found = findSuggestions(edited, suggestions)
        expect(found).toHaveLength(1)
        expect(edited.slice(found[0].start, found[0].end)).toBe(suggestions[0])
        expect(liveSuggestions(edited, suggestions)).toEqual([suggestions[0]])
    })

    it('wraps them again for the model, round trip', () => {
        const { text, suggestions } = extractSuggestions(raw)
        expect(extractSuggestions(wrapSuggestions(text, suggestions))).toEqual({ text, suggestions })
    })

    it('marks suggestions and placeholders in the backdrop without moving text', () => {
        const text = 'Mine. [add a number] Then a suggested line.'
        const html = markPlaceholders(text, findSuggestions(text, ['Then a suggested line.']))
        expect(html).toContain('data-placeholder="0"')
        expect(html).toContain('<mark data-suggestion="0"')
        expect(html.replace(/<[^>]+>/g, '')).toBe(text)
    })
})

describe('SuggestionNotice', () => {
    it('lists suggestions to check, jump to or keep', () => {
        const onJump = jest.fn()
        const onKeep = jest.fn()
        const text = 'One. Suggested A. Two. Suggested B.'
        render(<SuggestionNotice suggestions={findSuggestions(text, ['Suggested A.', 'Suggested B.'])} onJump={onJump} onKeep={onKeep} />)
        expect(screen.getByText('I suggested 2 details for you')).toBeInTheDocument()
        fireEvent.click(screen.getAllByText('Go to it')[1])
        expect(onJump.mock.calls[0][0].text).toBe('Suggested B.')
        fireEvent.click(screen.getAllByText('Keep')[0])
        expect(onKeep.mock.calls[0][0].text).toBe('Suggested A.')
    })
})

describe('PlaceholderNotice fill', () => {
    it('offers to suggest something for the spots', () => {
        const onFill = jest.fn()
        render(<PlaceholderNotice placeholders={findPlaceholders('A [add your own example] B')} onJump={jest.fn()} onFill={onFill} />)
        fireEvent.click(screen.getByText('Suggest something for it'))
        expect(onFill).toHaveBeenCalled()
    })
})
