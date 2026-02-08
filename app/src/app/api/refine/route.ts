import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import OpenAI from 'openai';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

import { UsageService } from '@/lib/billing/usage';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
    const start = Date.now();
    let status = 'success';
    let errorDetails: string | undefined;
    let userIdStr = 'anon';

    try {
        const { userId } = await auth();
        if (!userId) {
            status = 'error';
            errorDetails = 'Unauthorized';
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        userIdStr = userId;

        // 1. Rate Limiting
        const ip = getClientIp(req);
        const limitResult = rateLimit(`refine:${userId || ip}`, { windowMs: 15 * 60 * 1000, max: 20 });
        if (!limitResult.allowed) {
            status = 'rate_limited';
            return NextResponse.json({ error: 'Too many requests. Please try again in 15 minutes.' }, { status: 429 });
        }

        const { currentContent, instruction, beliefContext, selection, context } = await req.json();

        if (!currentContent && !selection) {
            status = 'error';
            errorDetails = 'Missing content';
            return NextResponse.json(
                { error: 'currentContent or selection is required' },
                { status: 400 }
            );
        }

        // If selection is provided, we are in "Contextual Edit/Rewrite" mode
        // Otherwise, we are in "Global Refinement" mode

        let systemMessage = "";
        let userPrompt = "";

        if (selection) {
            // SELECTION MODE: Precise, minimal edits
            systemMessage = `You are a professional editor revising text within an existing piece of writing.

Your task is to rewrite ONLY the selected text so that it:
- Clearly follows the user's instruction
- Preserves the author's voice, tone, and intent
- Flows seamlessly with the surrounding context
- Does not introduce new ideas, facts, or arguments

Editing rules:
- Make the minimum number of changes necessary to satisfy the instruction.
- Do NOT rewrite sentences that already work.
- Do NOT over-polish or neutralize the author's style.
- Maintain consistency in tense, point of view, and terminology.
- Do NOT change length significantly unless the instruction explicitly requests it.
- If the instruction is ambiguous, choose the interpretation that best preserves meaning.

Constraints:
- Do NOT modify the surrounding context.
- Do NOT add examples, metaphors, or explanations unless explicitly instructed.
- Return ONLY the revised text, with no commentary or formatting.

Think like a careful human editor improving clarity or tone, not an AI rewriting the piece.`;

            userPrompt = `CONTEXT BEFORE: "${context?.before || ''}"

SELECTED TEXT TO REWRITE: "${selection}"

CONTEXT AFTER: "${context?.after || ''}"

INSTRUCTION: 
<USER_INSTRUCTION_START>
${instruction}
<USER_INSTRUCTION_END>
`;

        } else {
            // GLOBAL MODE: Holistic refinement
            systemMessage = `You are a professional editor refining a complete piece of writing.

Your task is to improve the content while:
- Following the user's specific instruction
- Preserving the author's voice, perspective, and intent
- Maintaining the original meaning and key arguments
- Keeping thematic coherence with any provided belief context

Editing approach:
- Improve clarity, flow, and impact where needed.
- Tighten loose prose; cut redundancy.
- Do NOT over-polish into generic AI-sounding text.
- Do NOT add new arguments or change the author's position.
- Adjust length only if the instruction explicitly requests it.

Constraints:
- Return ONLY the refined content.
- Do NOT include explanations, commentary, or markdown code blocks.

Think like a trusted editor making a piece publication-ready.`;

            userPrompt = `${beliefContext ? `BELIEF/THEMATIC CONTEXT: "${beliefContext}"\n\n` : ''}CURRENT CONTENT:
${currentContent}

INSTRUCTION:
<USER_INSTRUCTION_START>
${instruction}
<USER_INSTRUCTION_END>
`;
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: userPrompt }
            ],
        });

        const refinedContent = completion.choices[0].message.content;

        return NextResponse.json({ refinedContent });
    } catch (error) {
        console.error("Refinement error:", error);
        status = 'error';
        errorDetails = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: "Failed to refine content" }, { status: 500 });
    } finally {
        UsageService.logPerformance('api_refine', {
            duration: Date.now() - start,
            status,
            error: errorDetails,
            userId: userIdStr
        });
    }
}
