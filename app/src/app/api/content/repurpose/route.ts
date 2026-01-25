import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { repurposeContent, generateImage } from '@/lib/openai';

import { UsageService } from '@/lib/billing/usage';

export async function POST(req: Request) {
    try {
        const { sourceId, platform, options } = await req.json();

        // 1. Fetch source (Check drafts first as request comes from Editor)
        let sourceContent = "";
        let sourceHook = "";
        let userId = "";

        const { data: draftSource } = await supabase
            .from('drafts')
            .select('*')
            .eq('id', sourceId)
            .single();

        if (draftSource) {
            userId = draftSource.user_id;
        } else {
            const { data: itemSource } = await supabase
                .from('content_items')
                .select('user_id')
                .eq('id', sourceId)
                .single();
            if (itemSource) userId = itemSource.user_id;
        }

        if (!userId) {
            // Try to get from auth context if possible, but for now rely on source ownership
            // Ideally we should use getOrCreateUser() here for security!
            // Let's defer to the existing logic flow but we NEED userId for the check.
            return NextResponse.json({ error: "User not found" }, { status: 401 });
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

        // ... Refetch for content ...
        if (draftSource) {
            sourceContent = draftSource.content;
            sourceHook = draftSource.belief_text;
        } else {
            // Fallback to content_items
            const { data: itemSource } = await supabase
                .from('content_items')
                .select('*')
                .eq('id', sourceId)
                .single();

            if (itemSource) {
                sourceContent = itemSource.draft_content || itemSource.hook;
                sourceHook = itemSource.hook;
            }
        }

        if (draftSource) {
            sourceContent = draftSource.content;
            sourceHook = draftSource.belief_text;
            userId = draftSource.user_id;
        } else {
            // Fallback to content_items
            const { data: itemSource } = await supabase
                .from('content_items')
                .select('*')
                .eq('id', sourceId)
                .single();

            if (itemSource) {
                sourceContent = itemSource.draft_content || itemSource.hook;
                sourceHook = itemSource.hook;
                userId = itemSource.user_id;
            }
        }

        if (!sourceContent) {
            return NextResponse.json({ error: "Source content not found" }, { status: 404 });
        }

        // 2. Generate Text Content
        const { title: newTitle, content: generatedContent, extraData } = await repurposeContent(sourceContent, platform, options);

        // Merge extraData (slides, hashtags) into options for storage
        if (extraData) {
            Object.assign(options, { ...extraData });
        }

        // 3. Generate Assets (if requested)
        const assets: any[] = [];
        let imagePrompt = "";
        const titleForPrompt = newTitle || sourceHook;

        if (platform === 'medium' && options.generateCover) {
            imagePrompt = `Minimalist editorial illustration for an article titled "${titleForPrompt}". Professional, abstract, high quality, 4k.`;
        } else if (platform === 'instagram' && options.generateInfographic) {
            imagePrompt = `Infographic style illustration for a social media post about "${titleForPrompt}". Bold typography, clean lines, educational, 1080x1080 aspect ratio.`;
        }

        let finalContent = generatedContent;

        if (imagePrompt) {
            const imageUrl = await generateImage(imagePrompt);
            if (imageUrl) {
                assets.push({
                    type: 'image',
                    role: platform === 'medium' ? 'cover' : 'infographic',
                    url: imageUrl,
                    prompt: imagePrompt
                });

                // Embed image at top of content
                finalContent = `![Cover Art](${imageUrl})\n\n${generatedContent}`;
            }
        }

        // 4. Save New Draft (Primary for Editor visibility)
        const { data: newDraft, error: draftError } = await supabase
            .from('drafts')
            .insert({
                user_id: userId,
                belief_text: newTitle || sourceHook, // Clean title
                content: finalContent,
                status: 'draft',
                platform,
                platform_metadata: options, // Generic metadata storage
                parent_id: draftSource ? sourceId : null,
                root_id: draftSource ? (draftSource.root_id || sourceId) : null
            })
            .select()
            .single();

        if (draftError) throw draftError;

        // 5. Optional: Also save to content_items for Pipeline visibility (Silent sync)
        await supabase.from('content_items').insert({
            user_id: userId,
            hook: newTitle || sourceHook,
            stage: 'draft',
            draft_content: finalContent,
            brain_metadata: {
                source: { type: 'variation', id: sourceId },
                platform,
                platform_metadata: options,
                repurpose: {
                    platform,
                    metadata: options,
                    generatedAssets: assets,
                    parentId: sourceId,
                    linkedDraftId: newDraft.id
                }
            }
        });


        // Increment usage count
        await UsageService.incrementDraftCount(userId);

        return NextResponse.json({
            id: newDraft.id,
            content: finalContent,
            platform_metadata: newDraft.platform_metadata,
            assets: assets || []
        });

    } catch (e: any) {
        console.error("Repurpose failed:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
