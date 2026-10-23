import { render, screen, fireEvent } from '@testing-library/react'
import { addRules, cleanOrigins, dedupeRules, parseTidy, ruleKey } from '@/lib/voice/rules'
import { TidyRulesPanel } from '@/components/voice/TidyRulesPanel'

describe('dedupeRules', () => {
    it('drops empties and repeats that differ only in case or punctuation', () => {
        expect(dedupeRules(['Use short sentences.', 'use short sentences', '  ', 'No emojis!'])).toEqual(['Use short sentences.', 'No emojis!'])
        expect(ruleKey('  No "jargon", ever. ')).toBe('no jargon ever')
    })
})

describe('addRules', () => {
    const origins = {
        'Learned old': { source: 'edit' as const, at: '2026-01-01T00:00:00Z' },
        'Learned newer': { source: 'edit' as const, at: '2026-06-01T00:00:00Z' },
    }

    it('adds new rules and skips repeats', () => {
        expect(addRules(['A rule'], ['a rule.', 'Another'])).toEqual(['A rule', 'Another'])
    })

    it('past the cap drops the oldest learned rules first, not hand-made ones', () => {
        const current = ['Mine 1', 'Learned old', 'Mine 2', 'Learned newer']
        expect(addRules(current, ['Fresh'], origins, 4)).toEqual(['Mine 1', 'Mine 2', 'Learned newer', 'Fresh'])
    })

    it('keeps the newest when only hand-made rules are left to drop', () => {
        expect(addRules(['M1', 'M2', 'M3'], ['M4'], {}, 3)).toEqual(['M2', 'M3', 'M4'])
    })
})

describe('cleanOrigins', () => {
    it('keeps well-formed entries only', () => {
        expect(cleanOrigins({ a: { source: 'edit', at: '2026-10-23', why: 'cut adverbs' }, b: { source: 'magic', at: 'x' }, c: 'junk' }))
            .toEqual({ a: { source: 'edit', at: '2026-10-23', why: 'cut adverbs' } })
        expect(cleanOrigins(null)).toEqual({})
    })
})

describe('parseTidy', () => {
    const original = { rules: ['Short sentences', 'Keep sentences short', 'Be warm'], anti_patterns: ['No emojis'] }

    it('keeps merges with two or more sources and conflicts with both sides', () => {
        const t = parseTidy({
            rules: ['Keep sentences short', 'Be warm', 'be warm'],
            anti_patterns: ['No emojis'],
            merged: [{ into: 'Keep sentences short', from: ['Short sentences', 'Keep sentences short'] }, { into: 'x', from: ['only one'] }],
            conflicts: [{ a: 'Be warm', b: 'No emojis', why: 'Warmth often uses emoji' }, { a: 'half' }],
        }, original)
        expect(t.rules).toEqual(['Keep sentences short', 'Be warm'])
        expect(t.merged).toHaveLength(1)
        expect(t.conflicts).toEqual([{ a: 'Be warm', b: 'No emojis', why: 'Warmth often uses emoji' }])
    })

    it('never wipes a list the model returned empty', () => {
        const t = parseTidy({ rules: [], anti_patterns: [] }, original)
        expect(t.rules).toEqual(original.rules)
        expect(t.anti_patterns).toEqual(['No emojis'])
    })
})

describe('TidyRulesPanel', () => {
    it('shows the before and after counts, merges and conflicts, and applies', () => {
        const onApply = jest.fn()
        render(<TidyRulesPanel
            proposal={{ rules: ['A'], anti_patterns: ['B'], merged: [{ into: 'A', from: ['a1', 'a2'] }], conflicts: [{ a: 'A', b: 'B', why: 'They clash' }] }}
            before={{ rules: 2, anti_patterns: 1 }}
            saving={false}
            onApply={onApply}
            onCancel={jest.fn()}
        />)
        expect(screen.getByText(/Do's go from 2 to 1/)).toBeInTheDocument()
        expect(screen.getByText('They clash')).toBeInTheDocument()
        fireEvent.click(screen.getByText('Apply'))
        expect(onApply).toHaveBeenCalled()
    })

    it('says so when there is nothing to tidy', () => {
        render(<TidyRulesPanel proposal={{ rules: ['A'], anti_patterns: [], merged: [], conflicts: [] }} before={{ rules: 1, anti_patterns: 0 }} saving={false} onApply={jest.fn()} onCancel={jest.fn()} />)
        expect(screen.getByText(/already tidy/)).toBeInTheDocument()
        expect(screen.queryByText('Apply')).not.toBeInTheDocument()
    })
})
