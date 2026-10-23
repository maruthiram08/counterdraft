import { parseOpenings, replaceOpening, seeMoreCut, splitOpening } from '@/lib/editor/openings'

describe('seeMoreCut', () => {
    it('shows a short post whole', () => {
        expect(seeMoreCut('Short post.', 'phone')).toEqual({ visible: 'Short post.', hidden: '', truncated: false })
    })

    it('cuts earlier on a phone than on desktop, on a word boundary', () => {
        const post = 'word '.repeat(60).trim()
        const phone = seeMoreCut(post, 'phone')
        const desktop = seeMoreCut(post, 'desktop')
        expect(phone.truncated).toBe(true)
        expect(phone.visible.length).toBeLessThanOrEqual(140)
        expect(desktop.visible.length).toBeGreaterThan(phone.visible.length)
        expect(phone.visible.endsWith('word')).toBe(true)
        expect(`${phone.visible} ${phone.hidden}`).toBe(post)
    })

    it('stops after three lines even when they are short', () => {
        const cut = seeMoreCut('One.\nTwo.\nThree.\nFour.\nFive.', 'desktop')
        expect(cut.visible).toBe('One.\nTwo.\nThree.')
        expect(cut.hidden).toBe('Four.\nFive.')
    })
})

describe('splitOpening and replaceOpening', () => {
    const post = 'I fired my best engineer.\nIt was the right call.\n\nHere is why.\n\nThe end.'

    it('takes the first paragraph as the opening', () => {
        expect(splitOpening(post)).toEqual({ opening: 'I fired my best engineer.\nIt was the right call.', rest: 'Here is why.\n\nThe end.' })
        expect(splitOpening('One paragraph only')).toEqual({ opening: 'One paragraph only', rest: '' })
    })

    it('swaps the opening and keeps the rest', () => {
        expect(replaceOpening(post, '  62% of new managers regret their first firing. \n')).toBe('62% of new managers regret their first firing.\n\nHere is why.\n\nThe end.')
    })
})

describe('parseOpenings', () => {
    it('keeps well-formed options, clamps ratings and drops repeats of the current opening', () => {
        const result = parseOpenings({
            current: { rating: 9, note: 'Buries the point' },
            options: [
                { style: 'Bold claim', text: 'Hiring fast is a tax.', why: 'Sharp', rating: 4.6 },
                { style: 'Repeat', text: 'My current opening', rating: 3 },
                { style: 'Empty', text: '   ' },
                'junk',
                { style: 'Number', text: '62% regret it.', rating: 0 },
                { style: 'Fourth', text: 'A fourth one.', rating: 3 },
            ],
        }, 'My current opening')
        expect(result.current).toEqual({ rating: 5, note: 'Buries the point' })
        expect(result.options.map(o => o.text)).toEqual(['Hiring fast is a tax.', '62% regret it.', 'A fourth one.'])
        expect(result.options.map(o => o.rating)).toEqual([5, 1, 3])
    })

    it('copes with nothing usable', () => {
        expect(parseOpenings(null)).toEqual({ current: null, options: [] })
    })
})
