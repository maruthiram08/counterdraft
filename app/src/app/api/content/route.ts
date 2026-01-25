
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getOrCreateUser } from '@/lib/user-sync';
import { UsageService } from '@/lib/billing/usage';
import { brainService } from '@/lib/brain/service';
import { Belief } from '@/types';

// GET /api/content - List content items with optional stage filter
export async function GET(req: Request) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const stage = searchParams.get('stage'); // idea, developing, draft, published
        const status = searchParams.get('status') || 'active';

        let query = supabaseAdmin
            .from('content_items')
            .select('*')
            .eq('user_id', userId)
            .eq('status', status)
            .order('updated_at', { ascending: false });

        if (stage) {
            query = query.eq('stage', stage);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json({ items: data });
    } catch (err: any) {
        console.error('Content API GET Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST /api/content - Create new content item
export async function POST(req: Request) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const {
            hook,
            angle,
            format,
            source_type,
            source_id,
            source_topics,
            stage = 'idea',
            draft_content,
            brain_metadata,
            dev_step,
            references = [] // Array of { type, title, content, url, filePath }
        } = body;

        // Check Usage Limits (Only if creating a real draft/dev item, not just an idea)
        // Ideas are free.
        const isDraftOrDev = stage === 'draft' || stage === 'developing';
        console.log(`[POST /api/content] Req Stage: ${stage} | isDraftOrDev: ${isDraftOrDev} | User: ${userId}`);

        if (isDraftOrDev) {
            const limitCheck = await UsageService.checkDraftLimit(userId);
            console.log(`[POST /api/content] Limit Check:`, limitCheck);

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
        }

        // 1. Create Content Item
        const { data: item, error: itemError } = await supabaseAdmin
            .from('content_items')
            .insert({
                user_id: userId,
                hook,
                angle,
                format,
                source_type,
                source_id,
                source_topics,
                stage,
                draft_content,
                brain_metadata,
                dev_step,
            })
            .select()
            .single();

        if (itemError) throw itemError;

        // 1.5 Deep Logic: Genealogy & Confidence Check
        if (stage === 'developing' || stage === 'idea') {
            try {
                // Determine Genealogy (Find Parent/Root)
                const { data: beliefs } = await supabaseAdmin
                    .from('beliefs')
                    .select('id, statement, belief_type')
                    .eq('user_id', userId);

                const roots = (beliefs || []).map(b => ({
                    id: b.id,
                    statement: b.statement,
                    type: b.belief_type
                }));

                const [genealogy, confidence] = await Promise.all([
                    brainService.analyzeGenealogy(hook, roots),
                    brainService.calculateConfidence(hook, (beliefs || []) as any as Belief[])
                ]);

                // Update item with genealogy and update metadata with confidence
                const updatedMetadata = {
                    ...brain_metadata,
                    confidence: confidence.level,
                    confidence_score: confidence.score,
                    confidence_reasoning: confidence.reasoning
                };

                await supabaseAdmin
                    .from('content_items')
                    .update({
                        root_belief_id: genealogy.rootId,
                        brain_metadata: updatedMetadata
                    })
                    .eq('id', item.id);

                // Refresh item in response
                item.root_belief_id = genealogy.rootId;
                item.brain_metadata = updatedMetadata;

            } catch (logicError) {
                console.error('Brain V1 Logic Failed (non-blocking):', logicError);
            }
        }

        // 2. Create References (if any)
        if (references && references.length > 0) {
            const formattedRefs = references.map((ref: any) => ({
                content_item_id: item.id,
                reference_type: ref.type,
                title: ref.title || 'Untitled Reference',
                content: ref.content,
                url: ref.url,
                file_path: ref.filePath // Optional, for files
            }));

            const { error: refError } = await supabaseAdmin
                .from('content_references')
                .insert(formattedRefs);

            if (refError) {
                console.error('Error creating references:', refError);
                // We don't fail the whole request, but logging is important
            }
        }

        // Increment usage count if it was a draft
        if (isDraftOrDev) {
            await UsageService.incrementDraftCount(userId);
        }

        console.log(`[POST /api/content] Created item ${item.id} with stage ${item.stage}`);
        return NextResponse.json({ item }, { status: 201 });
    } catch (err: any) {
        console.error('Content API POST Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// PATCH /api/content - Update content item
export async function PATCH(req: Request) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID required' }, { status: 400 });
        }

        // CHECK LIMIT IF PROMOTING TO DRAFT
        let shouldIncrement = false;

        if (updates.stage === 'draft' || updates.stage === 'developing') {
            // Check if it was previously NOT a draft? 
            const { data: current } = await supabaseAdmin
                .from('content_items')
                .select('stage')
                .eq('id', id)
                .single();

            // FIX: Count limit if we are moving TO 'draft' from ANY other stage (idea, developing)
            // AND ensure we aren't just updating an existing draft.
            // If current stage is null (shouldn't happen), assume idea.
            const currentStage = current?.stage || 'idea';
            const wasNotDraft = currentStage !== 'draft' && currentStage !== 'developing';
            // Wait, if I am in 'developing' (Wizard), and I save... it patches with stage='developing'.
            // If I then 'Finish' -> stage='draft'.
            // Do we count 'developing' items as drafts? Yes, usually.
            // The Wizard creates an item as 'developing' immediately.

            // LOGIC:
            // 1. Idea -> Developing: COUNT
            // 2. Developing -> Draft: FREE (Already counted)
            // 3. Idea -> Draft: COUNT

            // So we count if DESTINATION is (draft OR dev) AND ORIGIN is (idea).
            const isDestinationCountable = updates.stage === 'draft' || updates.stage === 'developing';
            const isOriginFree = currentStage === 'idea';

            const isPromoting = isDestinationCountable && isOriginFree;

            console.log(`[PATCH /api/content] ID: ${id} | Update: ${updates.stage} | Current: ${currentStage} | Promoting: ${isPromoting}`);

            if (isPromoting) {
                const limitCheck = await UsageService.checkDraftLimit(userId);
                console.log(`[PATCH /api/content] Limit Check:`, limitCheck);

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
                shouldIncrement = true;
            }
        }

        // Add updated_at
        updates.updated_at = new Date().toISOString();

        const { data, error } = await supabaseAdmin
            .from('content_items')
            .update(updates)
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;

        // SYNC: If moving to draft stage, ensure it exists in drafts table (Editor Visibility)
        if (updates.stage === 'draft') {
            await supabaseAdmin.from('drafts').upsert({
                id: data.id,
                user_id: userId,
                belief_text: data.hook || data.angle || 'Untitled Draft',
                content: data.draft_content || '',
                status: 'draft',
                updated_at: new Date().toISOString()
            });
        }

        // Increment usage if we successfully promoted
        if (shouldIncrement) {
            console.log(`[PATCH /api/content] Incrementing usage for User ${userId}`);
            await UsageService.incrementDraftCount(userId);
        }

        return NextResponse.json({ item: data });
    } catch (err: any) {
        console.error('Content API PATCH Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE /api/content - Delete content item (hard delete)
export async function DELETE(req: Request) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID required' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('content_items')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;

        // Note: We do not decrement usage on delete, to prevent abuse (create -> delete -> create)

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Content API DELETE Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
