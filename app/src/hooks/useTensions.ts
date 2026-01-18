import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface Tension {
    id: string;
    beliefA: string;
    beliefB: string;
    summary: string;
    classification: 'pending' | 'inconsistency' | 'intentional_nuance' | 'explore';
}

export function useTensions() {
    const [tensions, setTensions] = useState<Tension[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchTensions() {
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
                    setTensions([]);
                    return;
                }

                // 2. Fetch Tensions
                const { data, error: tensionsError } = await supabase
                    .from('tensions')
                    .select('id, tension_summary, user_classification, belief_a_text, belief_b_text')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (tensionsError) throw tensionsError;

                // 3. Map to UI format
                const mapped: Tension[] = (data || []).map((t: any) => ({
                    id: t.id,
                    beliefA: t.belief_a_text || 'Belief A',
                    beliefB: t.belief_b_text || 'Belief B',
                    summary: t.tension_summary,
                    classification: t.user_classification || 'pending'
                }));

                setTensions(mapped);

            } catch (err: any) {
                console.error("Error fetching tensions:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchTensions();
    }, []);

    const classifyTension = async (tensionId: string, classification: 'inconsistency' | 'intentional_nuance' | 'explore') => {
        try {
            const { error } = await supabase
                .from('tensions')
                .update({ user_classification: classification })
                .eq('id', tensionId);

            if (error) throw error;

            // Update local state
            setTensions(prev => prev.map(t =>
                t.id === tensionId ? { ...t, classification } : t
            ));

            return true;
        } catch (err: any) {
            console.error("Error classifying tension:", err);
            return false;
        }
    };

    return { tensions, loading, error, classifyTension };
}
