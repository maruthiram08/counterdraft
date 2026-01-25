import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/user-sync';
import { PlagiarismService } from '@/lib/tools/plagiarism';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const draftId = searchParams.get('draftId');

        if (!draftId) {
            return NextResponse.json({ error: 'Draft ID required' }, { status: 400 });
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

        const { text, draftId } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text required' }, { status: 400 });
        }

        // 1. Run Plagiarism Check
        const result = await PlagiarismService.checkPlagiarism(text);

        // 2. Save to DB (if draftId)
        if (draftId) {
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
