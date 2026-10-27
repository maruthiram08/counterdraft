import { render, screen, fireEvent } from '@testing-library/react'
import { cleanAnswers, formatNotes, mergeNotes, parseDraftQuestions } from '@/lib/editor/draft-tools'
import { DraftNotesPanel } from '@/components/editor/DraftNotesPanel'
import { DraftQuestionsStep } from '@/components/pipeline/wizard/DraftQuestionsStep'

describe('parseDraftQuestions', () => {
    it('keeps up to three distinct questions with hints', () => {
        const qs = parseDraftQuestions({ questions: [
            { question: 'When did a night sky change how you work?', hint: 'one moment' },
            { question: 'when did a night sky change how you work?' },
            { question: '' },
            { question: 'Q2' }, { question: 'Q3' }, { question: 'Q4' },
        ] })
        expect(qs.map(q => q.question)).toEqual(['When did a night sky change how you work?', 'Q2', 'Q3'])
        expect(qs[0].hint).toBe('one moment')
        expect(parseDraftQuestions(undefined)).toEqual([])
    })
})

describe('cleanAnswers', () => {
    it('keeps answers and notes with text only', () => {
        expect(cleanAnswers([{ question: 'Q', answer: '  A  ' }, { question: 'Q2', answer: ' ' }, 'junk', { answer: 'Remembered later' }])).toEqual([
            { question: 'Q', answer: 'A' },
            { question: '', answer: 'Remembered later' },
        ])
        expect(cleanAnswers('nope')).toEqual([])
    })
})

describe('mergeNotes', () => {
    it('keeps earlier notes, replaces a re-answered question and adds new ones last', () => {
        const merged = mergeNotes(
            [{ question: 'Where were you?', answer: 'Home' }, { question: '', answer: 'Our coach cried' }],
            [{ question: 'Where were you?', answer: 'At the stadium' }, { question: '', answer: 'The bus parade' }],
        )
        expect(merged).toEqual([
            { question: '', answer: 'Our coach cried' },
            { question: 'Where were you?', answer: 'At the stadium' },
            { question: '', answer: 'The bus parade' },
        ])
        expect(mergeNotes(undefined, [])).toEqual([])
    })

    it('formats notes under their questions', () => {
        expect(formatNotes([{ question: 'Q', answer: 'A' }, { question: '', answer: 'N' }])).toBe('Q: Q\nA: A\n\nNote: N')
    })
})

describe('DraftQuestionsStep', () => {
    it('collects answers and offers a skip', () => {
        const onChange = jest.fn()
        const onSkip = jest.fn()
        render(<DraftQuestionsStep
            questions={[{ question: 'What happened that night?', hint: 'a sentence or two' }]}
            answers={[]}
            onChange={onChange}
            dontAsk={false}
            onDontAskChange={jest.fn()}
            onSkip={onSkip}
        />)
        fireEvent.change(screen.getByLabelText('What happened that night?'), { target: { value: 'I saw it from the roof' } })
        expect(onChange).toHaveBeenCalledWith(0, 'I saw it from the roof')
        fireEvent.click(screen.getByText('Skip and write the draft'))
        expect(onSkip).toHaveBeenCalled()
    })
})

describe('DraftNotesPanel', () => {
    it('saves a note for later and works the notes into the draft', () => {
        const onChange = jest.fn()
        const onWorkIn = jest.fn()
        const notes = [{ question: 'Where were you?', answer: 'At the stadium' }]
        render(<DraftNotesPanel notes={notes} onChange={onChange} onWorkIn={onWorkIn} working={false} />)
        expect(screen.getByText('At the stadium')).toBeInTheDocument()
        fireEvent.change(screen.getByLabelText('Add a note'), { target: { value: 'The bus parade' } })
        fireEvent.click(screen.getByText('Work my notes into the draft'))
        const withNew = [...notes, { question: '', answer: 'The bus parade' }]
        expect(onChange).toHaveBeenCalledWith(withNew)
        expect(onWorkIn).toHaveBeenCalledWith(withNew)
        fireEvent.click(screen.getByLabelText('Remove note'))
        expect(onChange).toHaveBeenLastCalledWith([])
    })
})
