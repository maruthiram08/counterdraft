import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/user-sync';
import { PlagiarismService } from '@/lib/tools/plagiarism';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const maxDuration = 120; // Allow 2 minutes for multiple Tavily + LLM calls

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const draftId = searchParams.get('draftId');

        const userId = await getOrCreateUser();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        if (!draftId) {
            return NextResponse.json({ error: 'Draft ID required' }, { status: 400 });
        }

        // Check ownership
        const { data: draft } = await supabaseAdmin
            .from('drafts')
            .select('user_id')
            .eq('id', draftId)
            .single();

        if (!draft || draft.user_id !== userId) {
            return NextResponse.json({ error: 'Draft not found or unauthorized' }, { status: 403 });
        }

        const { data, error } = await supabaseAdmin
            .from('plagiarism_checks')
            .select('*')
            .eq('draft_id', draftId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        return NextResponse.json({ result: data });
    } catch (error) {
        console.error("Plagiarism GET Error:", error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 0. Rate Limiting
        const ip = getClientIp(req);
        const limitResult = rateLimit(`plagiarism:${userId || ip}`, { windowMs: 15 * 60 * 1000, max: 10 });
        if (!limitResult.allowed) {
            return NextResponse.json({ error: 'Too many requests. Please try again in 15 minutes.' }, { status: 429 });
        }

        const { text, draftId } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text required' }, { status: 400 });
        }

        // 1. Run Plagiarism Check
        const result = await PlagiarismService.checkPlagiarism(text);

        // 2. Save to DB (if draftId)
        if (draftId) {
            // Check ownership
            const { data: draft } = await supabaseAdmin
                .from('drafts')
                .select('user_id')
                .eq('id', draftId)
                .single();

            if (!draft || draft.user_id !== userId) {
                return NextResponse.json({ error: 'Draft unauthorized' }, { status: 403 });
            }
            const { error } = await supabaseAdmin.from('plagiarism_checks').insert({
                draft_id: draftId,
                uniqueness_score: result.uniqueness_score,
                matched_sources: result.matched_sources
            });
            if (error) console.error("Error saving plagiarism check:", error);
        }

        return NextResponse.json({ result });

    } catch (error) {
        console.error("Plagiarism Check API Error:", error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
