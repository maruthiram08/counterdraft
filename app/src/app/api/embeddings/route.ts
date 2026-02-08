import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { getOrCreateUser } from '@/lib/user-sync';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Generate embedding for text
async function generateEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
    });
    return response.data[0].embedding;
}

// POST: Generate and store embedding for content
export async function POST(req: Request) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { content_id, content_type, content_text } = await req.json();

        if (!content_id || !content_type || !content_text) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Generate embedding
        const embedding = await generateEmbedding(content_text);

        // Check if embedding already exists
        const { data: existing } = await supabase
            .from('content_embeddings')
            .select('id')
            .eq('content_id', content_id)
            .eq('content_type', content_type)
            .eq('user_id', userId)
            .single();

        if (existing) {
            // Update existing embedding
            const { error } = await supabase
                .from('content_embeddings')
                .update({
                    content_text,
                    embedding: JSON.stringify(embedding),
                    updated_at: new Date().toISOString(),
                    user_id: userId // Ensure ownership
                })
                .eq('id', existing.id)
                .eq('user_id', userId); // Extra safety

            if (error) throw error;
            return NextResponse.json({ message: 'Embedding updated', id: existing.id });
        } else {
            // Insert new embedding
            const { data, error } = await supabase
                .from('content_embeddings')
                .insert({
                    content_id,
                    content_type,
                    content_text,
                    embedding: JSON.stringify(embedding),
                    user_id: userId // Scope to user
                })
                .select('id')
                .single();

            if (error) throw error;
            return NextResponse.json({ message: 'Embedding created', id: data.id });
        }

    } catch (err: unknown) {
        console.error('Embedding API Error:', err);
        const message = err instanceof Error ? err.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// GET: Find similar content
type MatchRow = {
    user_id?: string;
    id?: string;
    content_id?: string;
    [key: string]: unknown;
};

export async function GET(req: Request) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const query = searchParams.get('query');
        const contentType = searchParams.get('type'); // Optional filter
        const limit = parseInt(searchParams.get('limit') || '5');

        if (!query) {
            return NextResponse.json({ error: 'Query required' }, { status: 400 });
        }

        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(query);

        // Search for similar content using pgvector
        // Note: This uses a raw SQL query for vector similarity
        const { data, error } = await supabase.rpc('match_embeddings', {
            query_embedding: queryEmbedding,
            match_count: limit,
            filter_type: contentType || null,
            filter_user_id: userId // Critical Security Filter
        });

        if (error) {
            // If the function doesn't exist, fall back to basic query
            console.error('RPC Error (may need to create function):', error);
            return NextResponse.json({
                similar: [],
                note: 'Similarity search requires pgvector RPC function'
            });
        }

        let filtered: MatchRow[] = Array.isArray(data) ? data : [];
        if (filtered.length > 0) {
            if ('user_id' in filtered[0]) {
                filtered = filtered.filter((row) => row.user_id === userId);
            } else if ('id' in filtered[0]) {
                const ids = filtered.map((row) => row.id).filter(Boolean) as string[];
                if (ids.length > 0) {
                    const { data: allowed } = await supabase
                        .from('content_embeddings')
                        .select('id')
                        .eq('user_id', userId)
                        .in('id', ids);
                    const allowedIds = new Set((allowed || []).map((row: { id: string }) => row.id));
                    filtered = filtered.filter((row: { id: string }) => allowedIds.has(row.id));
                } else {
                    filtered = [];
                }
            } else if ('content_id' in filtered[0]) {
                const contentIds = filtered.map((row) => row.content_id).filter(Boolean) as string[];
                if (contentIds.length > 0) {
                    const { data: allowed } = await supabase
                        .from('content_embeddings')
                        .select('content_id')
                        .eq('user_id', userId)
                        .in('content_id', contentIds);
                    const allowedIds = new Set((allowed || []).map((row: { content_id: string }) => row.content_id));
                    filtered = filtered.filter((row: { content_id: string }) => allowedIds.has(row.content_id));
                } else {
                    filtered = [];
                }
            }
        }

        return NextResponse.json({ similar: filtered });

    } catch (err: unknown) {
        console.error('Similarity Search Error:', err);
        const message = err instanceof Error ? err.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
