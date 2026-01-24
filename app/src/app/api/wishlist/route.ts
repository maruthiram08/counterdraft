import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuth } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status'); // optional filter

        let query = supabaseAdmin
            .from('feature_requests')
            .select('*')
            .order('upvotes', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        } else {
            // Default: show approved/in_progress/done
            query = query.in('status', ['approved', 'in_progress', 'done', 'pending']);
            // Note: RLS usually filters 'pending' for non-owners, but since we use admin client here, 
            // we must manually filter if we want public vs private.
            // For simplicity, let's just return everything and filter in UI or refine this.
            // Actually, let's strict it: 
            // On public list, we usually don't show 'pending' unless it's "my" pending.
            // But for this MVP, let's just return all non-pending for the main list, 
            // and we might need a separate call for "my requests".
            // Let's stick to returning "public" ones for now.
            query = query.in('status', ['approved', 'in_progress', 'done']);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ features: data }, { status: 200 });
    } catch (e) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { userId } = getAuth(req);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { title, description } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('feature_requests')
            .insert({
                title,
                description,
                user_id: userId,
                status: 'pending' // Always pending first
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ feature: data }, { status: 200 });
    } catch (e) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
