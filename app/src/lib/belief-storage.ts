import { supabaseAdmin } from "@/lib/supabase-admin";

export async function storeAnalysisResults(userId: string, analysis: any) {
    // Helper to map confidence
    const mapConfidence = (c: string) => {
        if (c?.toLowerCase() === 'high') return 0.9;
        if (c?.toLowerCase() === 'low') return 0.3;
        return 0.6; // medium
    };

    const beliefsToInsert = [
        ...(analysis.coreBeliefs || []).map((b: any) => ({
            user_id: userId,
            statement: b.statement,
            belief_type: 'core',
            original_statement: b.context || b.reasoning,
            confidence: mapConfidence(b.confidence),
            confidence_level: b.confidence?.toLowerCase() || 'medium',
            tags: b.tags || []
        })),
        ...(analysis.overusedAngles || []).map((b: any) => ({
            user_id: userId,
            statement: b.statement,
            belief_type: 'overused',
            original_statement: b.context || b.reasoning,
            confidence: mapConfidence(b.confidence),
            confidence_level: b.confidence?.toLowerCase() || 'medium',
            tags: b.tags || []
        })),
        ...(analysis.emergingThesis || []).map((b: any) => ({
            user_id: userId,
            statement: b.statement,
            belief_type: 'emerging',
            original_statement: b.context || b.reasoning,
            confidence: mapConfidence(b.confidence),
            confidence_level: b.confidence?.toLowerCase() || 'medium',
            tags: b.tags || []
        }))
    ];

    let insertedBeliefIds: Map<string, string> = new Map();

    if (beliefsToInsert.length > 0) {
        const { data: insertedBeliefs, error: beliefError } = await supabaseAdmin
            .from("beliefs")
            .insert(beliefsToInsert)
            .select("id, statement");

        if (beliefError) {
            console.error("Error storing beliefs:", beliefError);
        } else if (insertedBeliefs) {
            // Build statement -> id map
            insertedBeliefs.forEach((b: { id: string; statement: string }) => {
                insertedBeliefIds.set(b.statement, b.id);
            });
        }
    }

    // Store Tensions
    if (analysis.detectedTensions && analysis.detectedTensions.length > 0) {
        const tensionsToInsert = analysis.detectedTensions.map((t: { beliefA: string; beliefB: string; summary: string }) => {
            // Try to find matching belief IDs (partial match)
            let beliefAId = null;
            let beliefBId = null;

            for (const [statement, id] of insertedBeliefIds) {
                if (statement.toLowerCase().includes(t.beliefA.toLowerCase()) || t.beliefA.toLowerCase().includes(statement.toLowerCase())) {
                    beliefAId = id;
                }
                if (statement.toLowerCase().includes(t.beliefB.toLowerCase()) || t.beliefB.toLowerCase().includes(statement.toLowerCase())) {
                    beliefBId = id;
                }
            }

            return {
                user_id: userId,
                belief_a_id: beliefAId,
                belief_b_id: beliefBId,
                tension_summary: t.summary,
                belief_a_text: t.beliefA, // Store original text for display
                belief_b_text: t.beliefB,
                user_classification: 'pending'
            };
        });

        const { error: tensionError } = await supabaseAdmin
            .from("tensions")
            .insert(tensionsToInsert);

        if (tensionError) {
            console.error("Error storing tensions:", tensionError);
        } else {
            console.log(`Stored ${tensionsToInsert.length} tensions`);
        }
    }
}
