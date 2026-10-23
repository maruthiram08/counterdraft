import { render, screen, fireEvent } from '@testing-library/react'
import { cleanAnswers, parseDraftQuestions } from '@/lib/editor/draft-tools'
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
    it('keeps answered questions only', () => {
        expect(cleanAnswers([{ question: 'Q', answer: '  A  ' }, { question: 'Q2', answer: ' ' }, 'junk'])).toEqual([{ question: 'Q', answer: 'A' }])
        expect(cleanAnswers('nope')).toEqual([])
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
