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
        } = body;

        const { data, error } = await supabaseAdmin
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
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ item: data }, { status: 201 });
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
