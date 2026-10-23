import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { HookLab } from '@/components/editor/HookLab'
import { LinkedInPreview } from '@/components/editor/LinkedInPreview'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const post = `Most hiring advice is written for big companies.\n\n${'Startups hire differently and the advice does not fit them at all. '.repeat(3)}`

describe('HookLab', () => {
    afterEach(() => jest.restoreAllMocks())

    it('fetches openings, swaps one in, and can put the original back', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                current: { rating: 2, note: 'Generic' },
                options: [{ style: 'Bold claim', text: 'Startup hiring advice is broken.', why: 'Sharp', rating: 4 }],
            }),
        }) as unknown as typeof fetch
        const onApply = jest.fn()
        const { rerender } = render(<HookLab content={post} onApply={onApply} />)

        fireEvent.click(screen.getByText('Try 3 other openings'))
        await waitFor(() => expect(screen.getByText('Startup hiring advice is broken.')).toBeInTheDocument())
        expect(screen.getByText('Generic')).toBeInTheDocument()
        expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body).draft).toBe(post)

        fireEvent.click(screen.getByText('Use this'))
        const swapped = onApply.mock.calls[0][0]
        expect(swapped.startsWith('Startup hiring advice is broken.\n\nStartups hire differently')).toBe(true)

        rerender(<HookLab content={swapped} onApply={onApply} />)
        fireEvent.click(screen.getByText('Put back the original'))
        expect(onApply).toHaveBeenLastCalledWith(post)
    })

    it('stops offering undo once the post was edited after the swap', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ current: null, options: [{ style: 'Tension', text: 'New opening.', why: '', rating: 3 }] }),
        }) as unknown as typeof fetch
        const onApply = jest.fn()
        const { rerender } = render(<HookLab content={post} onApply={onApply} />)
        fireEvent.click(screen.getByText('Try 3 other openings'))
        await waitFor(() => screen.getByText('New opening.'))
        fireEvent.click(screen.getByText('Use this'))

        rerender(<HookLab content={`${onApply.mock.calls[0][0]} An edit.`} onApply={onApply} />)
        expect(screen.queryByText('Put back the original')).not.toBeInTheDocument()
    })
})

describe('LinkedInPreview', () => {
    it('cuts the post at see more and expands it', () => {
        render(<LinkedInPreview content={post} />)
        const body = screen.getByTestId('linkedin-post')
        expect(body.textContent).toContain('see more')
        expect(body.textContent).not.toContain(post.trim())
        fireEvent.click(screen.getByText('see more'))
        expect(screen.getByTestId('linkedin-post').textContent).toContain(post.trim())
    })

    it('shows more on desktop than on a phone', () => {
        render(<LinkedInPreview content={post} />)
        const phone = screen.getByTestId('linkedin-post').textContent!.length
        fireEvent.click(screen.getByRole('radio', { name: /Desktop/ }))
        expect(screen.getByTestId('linkedin-post').textContent!.length).toBeGreaterThan(phone)
    })

    it('warns when the post is over the character limit', () => {
        render(<LinkedInPreview content={'a '.repeat(1600)} />)
        expect(screen.getByText(/over LinkedIn's limit/)).toBeInTheDocument()
    })
})
