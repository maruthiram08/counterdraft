import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { getOrCreateUser } from '@/lib/user-sync';
import { cleanPostUrl, isPostPlatform } from '@/lib/posts/posted';

type Params = { params: Promise<{ id: string }> };

async function owner(id: string) {
    const { userId: clerkId } = await auth();
    if (!clerkId) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    const userId = await getOrCreateUser();
    if (!userId) return { error: NextResponse.json({ error: 'Failed to get user' }, { status: 500 }) };
    const { data: draft } = await supabase
        .from('drafts')
        .select('id, content')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();
    if (!draft) return { error: NextResponse.json({ error: 'Draft not found' }, { status: 404 }) };
    return { userId, draft };
}

async function records(draftId: string, userId: string) {
    const { data } = await supabase
        .from('published_posts')
        .select('id, platform_post_id')
        .eq('draft_id', draftId)
        .eq('user_id', userId);
    const all = data || [];
    // A URN means CounterDraft posted it to LinkedIn; everything else was marked by hand
    const isApi = (r: { platform_post_id: string | null }) => !!r.platform_post_id?.startsWith('urn:');
    return { api: all.filter(isApi), manual: all.filter(r => !isApi(r)) };
}

async function fresh(draftId: string, userId: string) {
    const { data } = await supabase
        .from('drafts')
        .select('*, published_posts(*)')
        .eq('id', draftId)
        .eq('user_id', userId)
        .maybeSingle();
    return data;
}

// POST /api/drafts/[id]/posted - Mark a draft as posted (by hand or with another tool), or update where/when it went out
export async function POST(req: NextRequest, { params }: Params) {
    try {
        const { id } = await params;
        const found = await owner(id);
        if ('error' in found) return found.error;
        const { userId, draft } = found;

        const body = await req.json().catch(() => ({}));
        const platform = isPostPlatform(body.platform) ? body.platform : 'other';

        const hasUrl = typeof body.url === 'string' && body.url.trim() !== '';
        const url = cleanPostUrl(body.url);
        if (hasUrl && !url) {
            return NextResponse.json({ error: "That link doesn't look right. Paste the full post link." }, { status: 400 });
        }

        let postedAt = new Date();
        if (body.postedAt) {
            const parsed = new Date(body.postedAt);
            if (Number.isNaN(parsed.getTime())) {
                return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
            }
            if (parsed.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
                return NextResponse.json({ error: "The date can't be in the future" }, { status: 400 });
            }
            postedAt = parsed;
        }
        const when = postedAt.toISOString();

        const { api, manual } = await records(id, userId);
        if (manual.length > 0) {
            const { error } = await supabase
                .from('published_posts')
                .update({ platform, platform_post_id: url, published_at: when })
                .eq('id', manual[0].id)
                .eq('user_id', userId);
            if (error) throw error;
        } else if (api.length === 0) {
            const { error } = await supabase
                .from('published_posts')
                .insert({
                    user_id: userId,
                    draft_id: id,
                    platform,
                    platform_post_id: url,
                    adapted_content: draft.content,
                    published_at: when,
                });
            if (error) throw error;
        }

        const { error: draftError } = await supabase
            .from('drafts')
            .update({ status: 'published', published_at: when, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', userId);
        if (draftError) throw draftError;

        // Keep the pipeline in step; older drafts may have no content item, which is fine
        await supabase
            .from('content_items')
            .update({
                stage: 'published',
                status: 'active',
                published_at: when,
                ...(platform !== 'other' ? { platform } : {}),
            })
            .eq('id', id)
            .eq('user_id', userId);

        return NextResponse.json({ draft: await fresh(id, userId) });
    } catch (error: unknown) {
        console.error('[POST /api/drafts/[id]/posted] Error:', error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// DELETE /api/drafts/[id]/posted - Move a post marked by hand back to drafts
export async function DELETE(_req: NextRequest, { params }: Params) {
    try {
        const { id } = await params;
        const found = await owner(id);
        if ('error' in found) return found.error;
        const { userId } = found;

        const { api, manual } = await records(id, userId);
        if (api.length > 0) {
            return NextResponse.json({ error: 'This post went out on LinkedIn through CounterDraft, so it stays in Posted.' }, { status: 409 });
        }

        if (manual.length > 0) {
            const { error } = await supabase
                .from('published_posts')
                .delete()
                .in('id', manual.map(r => r.id))
                .eq('user_id', userId);
            if (error) throw error;
        }

        const { error: draftError } = await supabase
            .from('drafts')
            .update({ status: 'draft', published_at: null, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', userId);
        if (draftError) throw draftError;

        await supabase
            .from('content_items')
            .update({ stage: 'draft', published_at: null })
            .eq('id', id)
            .eq('user_id', userId);

        return NextResponse.json({ draft: await fresh(id, userId) });
    } catch (error: unknown) {
        console.error('[DELETE /api/drafts/[id]/posted] Error:', error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
