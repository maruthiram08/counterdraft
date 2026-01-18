import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { currentContent, instruction, beliefContext } = await req.json();

        if (!currentContent || !instruction) {
            return NextResponse.json(
                { error: 'currentContent and instruction are required' },
                { status: 400 }
            );
        }

        const systemPrompt = `You are a helpful writing assistant. 
        const { currentContent, instruction, beliefContext, selection, context } = await req.json();

        // If selection is provided, we are in "Contextual Edit/Rewrite" mode
        // Otherwise, we are in "Global Refinement" mode
        
        let prompt = "";
        
        if (selection) {
            prompt = `
You are an expert editor.rewrite the selected text below based on the instruction.
Ensure the rewritten text flows naturally with the surrounding context.

CONTEXT BEFORE: "${context?.before || ''}"
CONTEXT AFTER: "${context?.after || ''}"

SELECTED TEXT TO REWRITE: "${selection}"

        INSTRUCTION: ${ instruction }

Return ONLY the rewritten text for the replacement.Do not include quotes or explanations.
`;
        } else {
            prompt = `
You are an expert editor.Refine the following content based on the user's instruction.
Keep the original meaning but improve clarity, tone, and impact.

BELIEF CONTEXT: "${beliefContext || 'None provided'}"

CURRENT CONTENT:
        "${currentContent}"

        INSTRUCTION: ${ instruction }

Return ONLY the refined content.Do not include markdown code blocks if not necessary.
`;
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a precise and high-quality writing assistant." },
                { role: "user", content: prompt }
            ],
        });

        const refinedContent = completion.choices[0].message.content;

        return NextResponse.json({ refinedContent });
    } catch (error) {
        console.error("Refinement error:", error);
        return NextResponse.json({ error: "Failed to refine content" }, { status: 500 });
    }
}
