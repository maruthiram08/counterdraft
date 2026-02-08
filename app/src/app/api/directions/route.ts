import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateIdeas } from "@/lib/brain/ideation";
import { getOrCreateUser } from "@/lib/user-sync";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 0. Rate Limiting
        const ip = getClientIp(req);
        const limitResult = rateLimit(`directions:${userId || ip}`, { windowMs: 15 * 60 * 1000, max: 20 });
        if (!limitResult.allowed) {
            return NextResponse.json({ error: 'Too many requests. Please try again in 15 minutes.' }, { status: 429 });
        }

        // 1. Fetch existing beliefs
        const { data: beliefs, error: beliefsError } = await supabaseAdmin
            .from('beliefs')
            .select('id, statement, belief_type')
            .eq('user_id', userId);

        if (beliefsError || !beliefs || beliefs.length === 0) {
            return NextResponse.json({
                ideas: [],
                message: "No beliefs found. Ingest content first."
            });
        }

        // 2. Format beliefs for AI
        const formattedBeliefs = beliefs.map(b => ({
            statement: b.statement,
            type: b.belief_type
        }));

        // 3. Generate ideas using OpenAI
        const result = await generateIdeas(formattedBeliefs, []);

        if (!result.ideas || result.ideas.length === 0) {
            return NextResponse.json({ ideas: [] });
        }

        // 4. Persist ideas to Pipeline (content_items)
        const itemsToInsert = result.ideas.map((idea: { topic: string; theme?: string; rationale?: string }) => ({
            user_id: userId,
            hook: idea.topic || idea.theme,
            angle: idea.rationale,
            stage: 'idea',
            source_type: 'ai_suggestion',
            format: 'post'
        }));

        const { data: insertedItems, error: insertError } = await supabaseAdmin
            .from('content_items')
            .insert(itemsToInsert)
            .select();

        if (insertError) {
            console.error("Error persisting generated ideas:", insertError);
            // Return generated ideas anyway (ephemeral fallback)
            return NextResponse.json({
                success: true,
                ideas: result.ideas,
                persisted: false
            });
        }

        return NextResponse.json({
            success: true,
            ideas: insertedItems,
            persisted: true
        });

    } catch (error: unknown) {
        console.error("Directions API Error:", error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json(
            { error: message, ideas: [] },
            { status: 500 }
        );
    }
}
