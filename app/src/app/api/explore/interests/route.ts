import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getOrCreateUser } from '@/lib/user-sync';

// Interest categories and subcategories
export const INTEREST_TREE = {
    tech: {
        label: 'Technology & AI',
        subcategories: ['ai_ethics', 'generative_models', 'startups', 'hardware'],
    },
    culture: {
        label: 'Culture & Society',
        subcategories: ['media', 'trends', 'philosophy'],
    },
    business: {
        label: 'Business & Strategy',
        subcategories: ['leadership', 'marketing', 'growth'],
    },
    personal: {
        label: 'Personal Development',
        subcategories: ['productivity', 'mindset', 'career'],
    },
};

// GET: Fetch current user interests
export async function GET() {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabaseAdmin
            .from('user_interests')
            .select('categories, subcategories')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            // PGRST116 = no rows, which is fine
            console.error('Error fetching interests:', error);
            return NextResponse.json({ error: 'Failed to fetch interests' }, { status: 500 });
        }

        return NextResponse.json({
            interests: data || { categories: [], subcategories: [] },
            availableCategories: INTEREST_TREE,
        });
    } catch (err) {
        console.error('API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST: Save or update user interests
export async function POST(req: Request) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { categories, subcategories } = await req.json();

        if (!Array.isArray(categories) || !Array.isArray(subcategories)) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('user_interests')
            .upsert(
                {
                    user_id: userId,
                    categories,
                    subcategories,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id' }
            );

        if (error) {
            console.error('Error saving interests:', error);
            return NextResponse.json({ error: 'Failed to save interests' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
