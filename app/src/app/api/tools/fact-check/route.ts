import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/user-sync';
import { FactCheckService } from '@/lib/tools/fact-check';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const draftId = searchParams.get('draftId');

        if (!draftId) {
            return NextResponse.json({ error: 'Draft ID required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('content_verifications')
            .select('*')
            .eq('draft_id', draftId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map back to VerificationResult format
        const results = data.map(r => ({
            claim: r.claim_text,
            original_sentence: r.original_sentence,
            status: r.status,
            confidence: r.confidence_score,
            source: r.source_url ? { url: r.source_url, snippet: r.source_snippet } : undefined,
            analysis: r.analysis_content
        }));

        return NextResponse.json({ results });
    } catch (error) {
        console.error("Fact Check GET Error:", error);
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

        // 1. Run Verification
        const results = await FactCheckService.verifyDraft(text);

        // 2. Save to DB (if draftId)
        if (draftId) {
            // Optional: Clear old verifications? Not for now, history is okay or just append.
            const rows = results.map(r => ({
                draft_id: draftId,
                claim_text: r.claim,
                original_sentence: r.original_sentence,
                status: r.status,
                confidence_score: r.confidence,
                source_url: r.source?.url,
                source_snippet: r.source?.snippet,
                analysis_content: r.analysis
            }));

            if (rows.length > 0) {
                const { error } = await supabaseAdmin.from('content_verifications').insert(rows);
                if (error) console.error("Error saving verifications:", error);
            }
        }

        return NextResponse.json({ results });

    } catch (error) {
        console.error("Fact Check API Error:", error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
