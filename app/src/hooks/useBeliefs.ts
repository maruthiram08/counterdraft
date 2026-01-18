
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Belief } from '@/types';

export type FeedbackType = 'accurate' | 'misses' | 'clarify';

export function useBeliefs() {
    const [beliefs, setBeliefs] = useState<{
        core: Belief[];
        overused: Belief[];
        emerging: Belief[];
        tensions: any[];
    }>({
        core: [],
        overused: [],
        emerging: [],
        tensions: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchBeliefs() {
            try {
                setLoading(true);

                // 1. Get Test User ID
                const { data: user, error: userError } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', 'test@counterdraft.com')
                    .single();

                if (userError || !user) {
                    console.warn("Test user not found");
                    return;
                }

                // 2. Fetch Beliefs (excluding already confirmed ones)
                const { data, error: beliefsError } = await supabase
                    .from('beliefs')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('user_confirmed', false) // Only show unconfirmed
                    .order('created_at', { ascending: false });

                if (beliefsError) throw beliefsError;

                // 3. Categorize & Map
                const mapBelief = (b: any): Belief => ({
                    id: b.id,
                    userId: b.user_id,
                    statement: b.statement,
                    beliefType: b.belief_type,
                    confidence: 1.0,
                    firstSeen: new Date(b.created_at),
                    lastSeen: new Date(b.created_at),
                    userConfirmed: b.user_confirmed || false,
                    userEdited: b.user_edited || false,
                    createdAt: new Date(b.created_at),
                    updatedAt: new Date(b.updated_at || b.created_at)
                });

                const core = data?.filter((b: any) => b.belief_type === 'core').map(mapBelief) || [];
                const overused = data?.filter((b: any) => b.belief_type === 'overused').map(mapBelief) || [];
                const emerging = data?.filter((b: any) => b.belief_type === 'emerging').map(mapBelief) || [];

                setBeliefs({
                    core: core as Belief[],
                    overused: overused as Belief[],
                    emerging: emerging as Belief[],
                    tensions: []
                });

            } catch (err: any) {
                console.error("Error fetching beliefs:", err);
                setError(err.message);
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
                .update({
                    user_confirmed: true,
                    // Optionally store the feedback type in a new column or user_feedback table
                })
                .eq('id', beliefId);

            if (updateError) throw updateError;

            // Also insert into user_feedback table for analytics
            const { data: user } = await supabase
                .from('users')
                .select('id')
                .eq('email', 'test@counterdraft.com')
                .single();

            if (user) {
                await supabase.from('user_feedback').insert({
                    user_id: user.id,
                    entity_type: 'belief',
                    entity_id: beliefId,
                    feedback_type: feedback
                });
            }

            // Remove from local state immediately
            setBeliefs(prev => ({
                ...prev,
                core: prev.core.filter(b => b.id !== beliefId),
                overused: prev.overused.filter(b => b.id !== beliefId),
                emerging: prev.emerging.filter(b => b.id !== beliefId)
            }));

            console.log(`[Feedback] Persisted: ${beliefId} → ${feedback}`);
            return true;

        } catch (err: any) {
            console.error("Error submitting feedback:", err);
            return false;
        }
    };

    return { beliefs, loading, error, submitFeedback };
}

