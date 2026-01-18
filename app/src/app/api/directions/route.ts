import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateIdeas } from "@/lib/openai";

export async function GET() {
    try {
        // 1. Get test user
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', 'test@counterdraft.com')
            .single();

        if (userError || !user) {
            return NextResponse.json({ ideas: [] }, { status: 200 });
        }

        // 2. Fetch existing beliefs
        const { data: beliefs, error: beliefsError } = await supabaseAdmin
            .from('beliefs')
            .select('id, statement, belief_type')
            .eq('user_id', user.id);

        if (beliefsError || !beliefs || beliefs.length === 0) {
            return NextResponse.json({
                ideas: [],
                message: "No beliefs found. Ingest content first."
            });
        }

        // 3. Format beliefs for AI
        const formattedBeliefs = beliefs.map(b => ({
            statement: b.statement,
            type: b.belief_type
        }));

        // 4. Generate ideas using OpenAI
        const result = await generateIdeas(formattedBeliefs, []);

        return NextResponse.json({
            success: true,
            ideas: result.ideas || []
        });

    } catch (error: any) {
        console.error("Directions API Error:", error);
        return NextResponse.json(
            { error: error.message, ideas: [] },
            { status: 500 }
        );
    }
}
