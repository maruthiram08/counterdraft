import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getOrCreateUser } from '@/lib/user-sync';
import { extractBeliefs } from '@/lib/openai';
import { storeAnalysisResults } from '@/lib/belief-storage';

export const maxDuration = 60; // Allow longer timeout for analysis

export async function POST(req: NextRequest) {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
        }

        const { text, contentId } = await req.json();

        if (!text || text.length < 50) {
            return NextResponse.json({ skipped: true, reason: 'Text too short' });
        }

        // Run extraction (awaited, not backgrounded)
        console.log(`[Knowledge Extract] Starting analysis for user ${userId} on content ${contentId || 'unknown'}...`);

        const analysis = await extractBeliefs([text]);

        // Store results
        await storeAnalysisResults(userId, analysis);

        console.log(`[Knowledge Extract] Completed. Found: ${analysis.coreBeliefs?.length || 0} beliefs, ${analysis.detectedTensions?.length || 0} tensions.`);

        return NextResponse.json({
            success: true,
            analysis: {
                beliefs: (analysis.coreBeliefs?.length || 0) + (analysis.emergingThesis?.length || 0),
                tensions: analysis.detectedTensions?.length || 0
            }
        });

    } catch (error: any) {
        console.error('[Knowledge Extract] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
