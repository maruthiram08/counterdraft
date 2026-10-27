import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { DraftStep } from '@/components/pipeline/wizard/DraftStep'

const base = {
    draftContent: '',
    loading: false,
    showContextPanel: false,
    verifyingStrategy: false,
    fixingStrategy: false,
    strategyAnalysis: null,
    brainMetadata: undefined,
    outline: [],
    deepDive: null,
    onUpdateDraft: () => {},
    onToggleContextPanel: () => {},
    onVerifyStrategy: () => {},
    onAutoFix: () => {},
    onRebuild: () => {},
}

describe('DraftStep with no draft', () => {
    it('offers Write draft when nothing was written yet, e.g. after a reload mid-draft', () => {
        const onWriteDraft = jest.fn()
        render(<DraftStep {...base} onWriteDraft={onWriteDraft} />)
        fireEvent.click(screen.getByRole('button', { name: /write draft/i }))
        expect(onWriteDraft).toHaveBeenCalled()
    })

    it('shows the error and Try again when the draft failed', () => {
        const onWriteDraft = jest.fn()
        render(<DraftStep {...base} draftError="Writing took too long and was cut off." onWriteDraft={onWriteDraft} />)
        expect(screen.getByText(/cut off/)).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: /try again/i }))
        expect(onWriteDraft).toHaveBeenCalled()
    })
})
