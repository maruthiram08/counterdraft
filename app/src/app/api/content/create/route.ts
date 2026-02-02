import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { Outcome, Stance, Audience, BrainMetadata, ConfidenceLevel } from '@/types';
import { getOrCreateUser } from '@/lib/user-sync';
import { UsageService } from '@/lib/billing/usage';
import { getOpenAI } from '@/lib/openai';

export async function POST(req: NextRequest) {
    try {
        // Get authenticated user UUID from Clerk via helper
        const userId = await getOrCreateUser();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check Usage Limits
        const limitCheck = await UsageService.checkDraftLimit(userId);
        if (!limitCheck.allowed) {
            return NextResponse.json(
                {
                    error: 'Limit Reached',
                    message: limitCheck.reason,
                    tier: limitCheck.tier,
                    upgradeUrl: '/pricing'
                },
                { status: 403 }
            );
        }

        // Parse request body
        const body = await req.json();
        const {
            hook,
            outcome,
            audience,
            stance,
            sourceType,
            sourceId
        }: {
            hook: string;
            outcome: Outcome;
            audience?: Audience;
            stance?: Stance;
            sourceType?: 'belief' | 'tension' | 'idea' | 'manual' | 'artifact' | 'synthesis';
            sourceId?: string;
            tags?: string[];
            entities?: string[];
            stage?: 'idea' | 'developing' | 'draft';
            context?: string; // NEW: Accept context/content from source
        } = body;

        // Validate required fields
        if (!hook || hook.trim().length < 10) {
            return NextResponse.json(
                { error: 'Hook must be at least 10 characters' },
                { status: 400 }
            );
        }

        if (!outcome) {
            return NextResponse.json(
                { error: 'Outcome is required' },
                { status: 400 }
            );
        }

        // Calculate initial confidence
        const confidence = calculateConfidence({
            outcome,
            audience,
            stance,
        });

        // Build brain_metadata
        const brainMetadata: BrainMetadata = {
            outcome,
            audience,
            stance,
            confidence,
            source: sourceType ? { type: sourceType, id: sourceId } : undefined,
            tags: body.tags,
            entities: body.entities,
            sourceContext: body.context, // NEW: Store starting context
            inferred: {
                // Track which values were inferred vs. explicitly provided
                outcome: false, // User selected it
                stance: !stance, // If not provided, we'll infer later
            },
        };

        // 3. AI Title Generation for Synthesis
        if (sourceType === 'synthesis' && body.context && body.context.length > 10) {
            try {
                console.log("Generating title for synthesis context:", body.context.slice(0, 50));
                const openai = getOpenAI();
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [
                        { role: "system", content: "You are an editor. Generate a provocative, 5-7 word title for this collection of notes. Return ONLY the title." },
                        { role: "user", content: body.context }
                    ],
                    max_tokens: 20
                });
                const aiTitle = completion.choices[0].message.content?.trim().replace(/^"|"$/g, '');
                if (aiTitle) {
                    // Update hook with AI title
                    // Note: We need to re-validate length if we were strict, but AI titles are usually fine.
                    // We modify the hook variable.
                    (body as any).hook = aiTitle;
                }
            } catch (e) {
                console.error("AI Title Gen Failed", e);
            }
        }

        const finalHook = (body as any).hook || hook.trim();

        // Create content_item
        const { data: contentItem, error: insertError } = await supabaseAdmin
            .from('content_items')
            .insert({
                user_id: userId,
                hook: finalHook,
                stage: body.stage || 'developing', // Allow override
                dev_step: null, // Wizard hasn't started yet
                brain_metadata: brainMetadata,
                draft_content: body.context || null, // NEW: Populate draft_content with synthesis text so it shows on card
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error creating content item:', insertError);
            return NextResponse.json(
                { error: 'Failed to create content item' },
                { status: 500 }
            );
        }

        // Increment usage count
        await UsageService.incrementDraftCount(userId);

        return NextResponse.json({
            contentItemId: contentItem.id,
            stage: contentItem.stage,
            confidence,
        });
    } catch (error) {
        console.error('Unexpected error in /api/content/create:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Helper function to calculate confidence level
function calculateConfidence(input: {
    outcome: Outcome;
    audience?: Audience;
    stance?: Stance;
}): ConfidenceLevel {
    let score = 0;

    // Outcome: explicit = +25
    if (input.outcome) score += 25;

    // Audience: both role and pain = +50
    if (input.audience?.role) score += 25;
    if (input.audience?.pain) score += 25;

    // Stance: explicit = +25
    if (input.stance) score += 25;

    // Determine confidence level
    if (score >= 75) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
}
