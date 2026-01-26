import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getOrCreateUser } from '@/lib/user-sync';

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

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Content API DELETE Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
