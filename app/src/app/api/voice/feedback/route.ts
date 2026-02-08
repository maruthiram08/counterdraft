import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { getOrCreateUser } from '@/lib/user-sync';

export async function POST(req: Request) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { draftId, instruction, reason, originalText, refinedText } = await req.json();

        // 1. Log to database for future training/voice adjustment
        const { error } = await supabase
            .from('voice_feedback')
            .insert({
                user_id: userId,
                draft_id: draftId,
                instruction,
                reason,
                original_text: originalText,
                refined_text: refinedText,
                created_at: new Date().toISOString()
            });

        if (error) {
            console.error("Feedback DB Error:", error);
            // We don't fail the request if DB logging fails, just log it
        }

        // 2. Proactively update the user's "Voice Profile" context if it's a critical tone issue
        // (Future enhancement: adjust system prompt based on this feedback)

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Feedback API Error:", err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
