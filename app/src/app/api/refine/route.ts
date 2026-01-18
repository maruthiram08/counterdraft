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
        Your goal is to refine the user's draft based on their specific instruction.
        
        Context (Belief): "${beliefContext || 'General'}"
        
        Rules:
        1. Return ONLY the refined content. Do not add conversational filler like "Here is the rewritten text".
        2. Maintain the core meaning of the original text unless asked to change it.
        3. If the instruction is a question, answer it concisely.
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Current Content:\n${currentContent}\n\nInstruction: ${instruction}` }
            ],
            temperature: 0.7,
        });

        const refinedContent = response.choices[0].message.content?.trim();

        return NextResponse.json({ refinedContent });
    } catch (error: any) {
        console.error('[POST /api/refine] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
