import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getOrCreateUser } from "@/lib/user-sync";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const { beliefStatement, tone = "professional" } = await req.json();

        if (!beliefStatement) {
            return NextResponse.json({ error: "Belief statement is required" }, { status: 400 });
        }

        // Verify user is authenticated
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const systemPrompt = `You are a professional content writer helping thought leaders articulate their beliefs.
        
Given a core belief, write a compelling ~200 word LinkedIn post or essay opening that:
1. Opens with a hook that challenges conventional thinking
2. Clearly states the belief as the author's stance
3. Provides one concrete example or observation
4. Ends with a thought-provoking question or call to reflection

Tone: ${tone}
Write in first person. Be direct and assertive. Avoid clichés.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Write a post based on this belief: "${beliefStatement}"` }
            ],
            max_tokens: 500,
            temperature: 0.8,
        });

        const draft = completion.choices[0]?.message?.content || "";

        // Generate alternative angles
        const anglesCompletion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "Suggest 3 alternative angles to write about this belief. Return as JSON: { angles: [string, string, string] }" },
                { role: "user", content: `Belief: "${beliefStatement}"` }
            ],
            max_tokens: 200,
            response_format: { type: "json_object" },
        });

        let angles: string[] = [];
        try {
            const parsed = JSON.parse(anglesCompletion.choices[0]?.message?.content || "{}");
            angles = parsed.angles || [];
        } catch {
            angles = [];
        }

        return NextResponse.json({
            success: true,
            draft,
            angles,
            beliefStatement
        });

    } catch (error: any) {
        console.error("Draft generation error:", error);
        return NextResponse.json({
            error: "Failed to generate draft",
            details: error.message
        }, { status: 500 });
    }
}
