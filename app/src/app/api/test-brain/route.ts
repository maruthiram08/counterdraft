import { NextResponse } from 'next/server';
import { brainService } from '@/lib/brain/service';
import { Belief } from '@/types';

// POST /api/test-brain
// Body: { action: 'infer' | 'confidence', ... }
export async function POST(req: Request) {
    try {
        const body = await req.json();

        if (body.action === 'infer') {
            const { topic, audience } = body;
            const outcome = await brainService.inferOutcome(topic, audience);
            return NextResponse.json({ result: outcome });
        }

        if (body.action === 'confidence') {
            const { topic, beliefs } = body;
            // Mock beliefs if not provided, just for structure test
            const beliefList: Belief[] = beliefs || [
                { id: '1', statement: 'Content must be authentic', type: 'core' },
                { id: '2', statement: 'AI should empower, not replace', type: 'core' }
            ];
            const result = await brainService.calculateConfidence(topic, beliefList);
            return NextResponse.json({ result });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
