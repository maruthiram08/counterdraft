import type { CaptureIntent } from '@/types';

// One colour per intent, shared by capture cards and the wizard's sources strip
export function intentChipClass(intent?: CaptureIntent): string {
    switch (intent) {
        case 'agree': return 'bg-sage-100 text-sage-700';
        case 'counter': return 'bg-rose-100 text-rose-700';
        case 'evidence': return 'bg-dusk-100 text-dusk-700';
        case 'style':
        case 'framing': return 'bg-ember-100 text-ember-700';
        default: return 'bg-canvas shadow-well text-ink-soft';
    }
}

export const INTENT_LABELS: Record<CaptureIntent, string> = {
    agree: 'Agree',
    counter: 'Counter',
    evidence: 'Evidence',
    example: 'Example',
    style: 'Style',
    framing: 'Framing',
};
