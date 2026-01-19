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
            .single();

        if (existing) {
            // Update existing embedding
            const { error } = await supabase
                .from('content_embeddings')
                .update({
                    content_text,
                    embedding: JSON.stringify(embedding),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id);

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
                })
                .select('id')
                .single();

            if (error) throw error;
            return NextResponse.json({ message: 'Embedding created', id: data.id });
        }

    } catch (err: any) {
        console.error('Embedding API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// GET: Find similar content
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
        });

        if (error) {
            // If the function doesn't exist, fall back to basic query
            console.error('RPC Error (may need to create function):', error);
            return NextResponse.json({
                similar: [],
                note: 'Similarity search requires pgvector RPC function'
            });
        }

        return NextResponse.json({ similar: data || [] });

    } catch (err: any) {
        console.error('Similarity Search Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
