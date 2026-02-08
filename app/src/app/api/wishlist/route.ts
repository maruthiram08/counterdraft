import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuth } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status'); // optional filter

        let query = supabaseAdmin
            .from('feature_requests')
            .select('id, title, description, status, upvotes, created_at')
            .order('upvotes', { ascending: false });

        if (status) {
            // Only allow filtering by 'pending' if authenticated
            if (status === 'pending') {
                const { userId } = getAuth(req);
                if (!userId) {
                    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
                }
            }
            query = query.eq('status', status);
        } else {
            // Default: show approved/in_progress/done
            // Only show 'pending' if authenticated? 
            // For now, let's keep it safe. Public list only shows approved/in_progress/done.
            query = query.in('status', ['approved', 'in_progress', 'done']);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ features: data }, { status: 200 });
    } catch (error: unknown) {
        console.error('[Wishlist GET] Error:', error);
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
    } catch (error: unknown) {
        console.error('[Wishlist POST] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
