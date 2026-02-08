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

        // Upsert embedding (scoped to user)
        const { data, error } = await supabase
            .from('content_embeddings')
            .upsert({
                content_id,
                content_type,
                content_text,
                embedding: JSON.stringify(embedding),
                user_id: userId,
                updated_at: new Date().toISOString()
            }, { onConflict: 'content_id,content_type,user_id' })
            .select('id')
            .single();

        if (error) throw error;
        return NextResponse.json({ message: 'Embedding saved', id: data.id });

    } catch (err: unknown) {
        console.error('Embedding API Error:', err);
        const message = err instanceof Error ? err.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

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
        // The RPC function now enforces user isolation via filter_user_id
        const { data, error } = await supabase.rpc('match_embeddings', {
            query_embedding: queryEmbedding,
            match_count: limit,
            filter_type: contentType || null,
            filter_user_id: userId
        });

        if (error) throw error;

        return NextResponse.json({ similar: data || [] });

    } catch (err: unknown) {
        console.error('Similarity Search Error:', err);
        const message = err instanceof Error ? err.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
