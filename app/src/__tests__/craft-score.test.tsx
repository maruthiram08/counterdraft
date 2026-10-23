import { render, screen } from '@testing-library/react'
import { cleanCraftFix, measureText, rateReadability, rateRhythm, scoreCraft, splitSentences } from '@/lib/editor/craft-score'
import { CraftScorePanel } from '@/components/editor/CraftScorePanel'

const long = 'This is a very long sentence that keeps going and going with clause after clause about the market and the team and the product and the customers until nobody can remember how it started or why.'
const varied = 'I shipped late. For three weeks the release slipped while we argued about a settings page that nobody would ever open. Then a customer called. She did not care about settings at all, she wanted the export to work. We cut the page that afternoon. It shipped on Friday.'

describe('splitSentences', () => {
    it('splits on punctuation and line breaks and skips placeholders and bullets', () => {
        expect(splitSentences('First one. Second!\n- Third line\n[Insert a story]')).toEqual(['First one.', 'Second!', 'Third line'])
    })
})

describe('rateReadability', () => {
    it('rates short plain sentences highly', () => {
        const c = rateReadability(measureText(varied))
        expect(c.rating).toBeGreaterThanOrEqual(4)
        expect(c.fix).toBe('')
    })

    it('flags long sentences and jargon with a fix that quotes them', () => {
        const c = rateReadability(measureText(`${long} We need to leverage synergy and a robust, seamlessly transformative approach.`))
        expect(c.rating).toBeLessThan(4)
        expect(c.fix).toContain('Split these long sentences')
        expect(c.fix).toContain('synergy')
    })
})

describe('rateRhythm', () => {
    it('flags sentences that are all the same length and start the same way', () => {
        const flat = 'We built the tool for teams. We tested the tool with users. We changed the tool after that. We shipped the tool in May.'
        const c = rateRhythm(measureText(flat))
        expect(c.rating).toBeLessThan(4)
        expect(c.note).toMatch(/start with "we"/)
    })

    it('likes varied sentences', () => {
        expect(rateRhythm(measureText(varied)).rating).toBeGreaterThanOrEqual(4)
    })
})

describe('scoreCraft', () => {
    it('combines model ratings with measured ones, weighted to 100', () => {
        const s = scoreCraft({ hook: { rating: 5, note: 'Strong' }, specifics: { rating: 2, note: 'Vague', fix: 'Name the customer' } }, varied)
        expect(s.criteria.map(c => c.key)).toEqual(['hook', 'specifics', 'readability', 'rhythm'])
        expect(s.criteria[0]).toMatchObject({ points: 30, fix: '' })
        expect(s.criteria[1]).toMatchObject({ points: 12, fix: 'Name the customer' })
        expect(s.score).toBe(s.criteria.reduce((a, c) => a + c.points, 0))
    })

    it('treats a bad model reply as zero, not a crash', () => {
        const s = scoreCraft('nonsense', varied)
        expect(s.criteria[0].rating).toBe(0)
    })
})

describe('cleanCraftFix', () => {
    it('accepts only known criteria with an instruction', () => {
        expect(cleanCraftFix({ key: 'hook', fix: ' Open on the number ' })).toEqual({ key: 'hook', fix: 'Open on the number' })
        expect(cleanCraftFix({ key: 'tone', fix: 'x' })).toBeNull()
        expect(cleanCraftFix({ key: 'hook', fix: '' })).toBeNull()
    })
})

describe('CraftScorePanel', () => {
    it('shows readability and rhythm before any check', () => {
        render(<CraftScorePanel content={varied} onApply={() => {}} />)
        expect(screen.getByText('Readability')).toBeInTheDocument()
        expect(screen.getByText('Rhythm')).toBeInTheDocument()
        expect(screen.queryByText('Hook')).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Check craft/ })).toBeEnabled()
    })
})
