import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Belief, ConfidenceLevel } from '@/types';

export type FeedbackType = 'accurate' | 'misses' | 'clarify';

export function useBeliefs() {
    const [beliefs, setBeliefs] = useState<{
        core: Belief[];
        overused: Belief[];
        emerging: Belief[];
        tensions: any[];
        confirmed: Belief[];
    }>({
        core: [],
        overused: [],
        emerging: [],
        tensions: [],
        confirmed: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        async function fetchBeliefs() {
            try {
                setLoading(true);

                // 1. Get authenticated user ID from API
                const userRes = await fetch('/api/user');
                const userData = await userRes.json();

                if (!userData.authenticated || !userData.userId) {
                    console.warn("User not authenticated");
                    setLoading(false);
                    return;
                }

                setUserId(userData.userId);

                // 2. Fetch ALL Beliefs (confirmed and unconfirmed)
                const { data, error: beliefsError } = await supabase
                    .from('beliefs')
                    .select('*')
                    .eq('user_id', userData.userId)
                    .order('created_at', { ascending: false });

                if (beliefsError) throw beliefsError;

                // 3. Categorize & Map
                const mapBelief = (b: any): Belief & { confidenceLevel: ConfidenceLevel; recencyWeight: number; isStable: boolean; evidenceCount: number; context?: string | null } => ({
                    id: b.id,
                    userId: b.user_id,
                    statement: b.statement,
                    beliefType: b.belief_type,
                    confidence: b.confidence || 1.0,
                    firstSeen: new Date(b.first_seen || b.created_at),
                    lastSeen: new Date(b.last_seen || b.created_at),
                    userConfirmed: b.user_confirmed || false,
                    userEdited: b.user_edited || false,
                    createdAt: new Date(b.created_at),
                    updatedAt: new Date(b.updated_at || b.created_at),
                    // Confidence model fields
                    confidenceLevel: b.confidence_level || 'medium',
                    recencyWeight: b.recency_weight ?? 1.0,
                    isStable: b.is_stable ?? false,
                    evidenceCount: b.evidence_count ?? 1,
                    context: b.original_statement, // Mapped from DB
                });

                // Separate confirmed (accepted) from unreviewed
                const unconfirmed = data?.filter((b: any) => !b.user_confirmed) || [];
                const confirmedData = data?.filter((b: any) => b.user_confirmed) || [];

                const core = unconfirmed.filter((b: any) => b.belief_type === 'core').map(mapBelief) || [];
                const overused = unconfirmed.filter((b: any) => b.belief_type === 'overused').map(mapBelief) || [];
                const emerging = unconfirmed.filter((b: any) => b.belief_type === 'emerging').map(mapBelief) || [];

                const confirmed = confirmedData.map(mapBelief) || [];

                setBeliefs({
                    core: core as Belief[],
                    overused: overused as Belief[],
                    emerging: emerging as Belief[],
                    tensions: [],
                    confirmed: confirmed as Belief[]
                });

            } catch (err: any) {
                console.error("Error fetching beliefs:", err);
                if (err && typeof err === 'object') {
                    console.error("Error details:", JSON.stringify(err, null, 2));
                    // Check for common issues
                    if (err.message) console.error("Error message:", err.message);
                    if (err.hint) console.error("Error hint:", err.hint);
                }
                setError(err.message || "Unknown error");
            } finally {
                setLoading(false);
            }
        }

        fetchBeliefs();
    }, []);

    // Submit feedback and persist to DB
    const submitFeedback = async (beliefId: string, feedback: FeedbackType): Promise<boolean> => {
        try {
            // Update belief as confirmed
            const { error: updateError } = await supabase
                .from('beliefs')
                .update({ user_confirmed: true })
                .eq('id', beliefId);

            if (updateError) throw updateError;

            // Insert into user_feedback table for analytics
            if (userId) {
                await supabase.from('user_feedback').insert({
                    user_id: userId,
                    entity_type: 'belief',
                    entity_id: beliefId,
                    feedback_type: feedback
                });
            }

            // Remove from local unreviewed lists immediately AND add to confirmed
            setBeliefs(prev => {
                let confirmedBelief: Belief | undefined;
                // Find it in unconfirmed lists to move it
                for (const list of [prev.core, prev.overused, prev.emerging]) {
                    const found = list.find(b => b.id === beliefId);
                    if (found) { confirmedBelief = found; break; }
                }

                if (confirmedBelief) {
                    confirmedBelief = { ...confirmedBelief, userConfirmed: true };
                }

                return {
                    ...prev,
                    core: prev.core.filter(b => b.id !== beliefId),
                    overused: prev.overused.filter(b => b.id !== beliefId),
                    emerging: prev.emerging.filter(b => b.id !== beliefId),
                    confirmed: confirmedBelief ? [confirmedBelief, ...prev.confirmed] : (prev.confirmed || [])
                };
            });

            console.log(`[Feedback] Persisted: ${beliefId} → ${feedback}`);
            return true;

        } catch (err: any) {
            console.error("Error submitting feedback:", err);
            return false;
        }
    };

    return { beliefs, loading, error, submitFeedback };
}
