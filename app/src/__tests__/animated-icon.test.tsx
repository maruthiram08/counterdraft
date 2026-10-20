import '@testing-library/jest-dom'
import { forwardRef, useImperativeHandle } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { AnimatedIcon, type AnimatedIconHandle } from '@/components/icons/AnimatedIcon'

const start = jest.fn()
const stop = jest.fn()

const FakeIcon = forwardRef<AnimatedIconHandle, { size?: number; className?: string }>(({ size, className }, ref) => {
    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }))
    return <div data-testid="icon" data-size={size} className={className} />
})
FakeIcon.displayName = 'FakeIcon'

function mockReducedMotion(reduce: boolean) {
    window.matchMedia = jest.fn().mockReturnValue({ matches: reduce }) as unknown as typeof window.matchMedia
}

beforeEach(() => {
    start.mockClear()
    stop.mockClear()
    mockReducedMotion(false)
})

describe('AnimatedIcon', () => {
    it('plays while its host button is hovered, not just the glyph', () => {
        render(<button>Publish <AnimatedIcon icon={FakeIcon} size={14} /></button>)
        const button = screen.getByRole('button')

        fireEvent.mouseEnter(button)
        expect(start).toHaveBeenCalledTimes(1)

        fireEvent.mouseLeave(button)
        expect(stop).toHaveBeenCalledTimes(1)
        expect(screen.getByTestId('icon')).toHaveAttribute('data-size', '14')
    })

    it('plays on keyboard focus too', () => {
        render(<button><AnimatedIcon icon={FakeIcon} /></button>)
        fireEvent.focusIn(screen.getByRole('button'))
        expect(start).toHaveBeenCalledTimes(1)
    })

    it('stays still when the user prefers reduced motion', () => {
        mockReducedMotion(true)
        render(<button><AnimatedIcon icon={FakeIcon} /></button>)
        fireEvent.mouseEnter(screen.getByRole('button'))
        expect(start).not.toHaveBeenCalled()
    })

    it('plays once when play turns truthy, not when it turns off', () => {
        const { rerender } = render(<AnimatedIcon icon={FakeIcon} play={false} />)
        expect(start).not.toHaveBeenCalled()

        rerender(<AnimatedIcon icon={FakeIcon} play={true} />)
        expect(start).toHaveBeenCalledTimes(1)

        rerender(<AnimatedIcon icon={FakeIcon} play={false} />)
        expect(start).toHaveBeenCalledTimes(1)
    })
})
