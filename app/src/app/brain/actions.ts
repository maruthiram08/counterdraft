'use server';

import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { getOrCreateUser } from '@/lib/user-sync';

interface GetArtifactsFilters {
    intent?: string;
    search?: string;
}

export async function getArtifacts(filters?: GetArtifactsFilters) {
    const { userId: clerkId } = await auth();
    if (!clerkId) throw new Error('Unauthorized');

    const userId = await getOrCreateUser();
    if (!userId) throw new Error('User sync failed');

    let query = supabase
        .from('thinking_artifacts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (filters?.intent) {
        query = query.eq('intent_type', filters.intent);
    }

    if (filters?.search) {
        query = query.or(`ocr_text.ilike.%${filters.search}%,user_note.ilike.%${filters.search}%,source_title.ilike.%${filters.search}%`);
    }

    const [{ data, error }, used] = await Promise.all([query, captureUseCounts(userId)]);
    if (error) throw new Error(error.message);

    return (data || []).map(artifact => ({ ...artifact, usedIn: used.get(artifact.id) || 0 }));
}

// How many Pipeline items were built from each capture
async function captureUseCounts(userId: string): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    const { data } = await supabase
        .from('content_items')
        .select('brain_metadata')
        .eq('user_id', userId)
        .eq('status', 'active')
        .eq('brain_metadata->explore->>from', 'captures');
    for (const item of data || []) {
        const sources: Array<{ captureId?: string }> = item.brain_metadata?.explore?.sources || [];
        for (const id of new Set(sources.map(s => s.captureId).filter((v): v is string => !!v))) {
            counts.set(id, (counts.get(id) || 0) + 1);
        }
    }
    return counts;
}

export async function deleteArtifact(id: string) {
    const { userId: clerkId } = await auth();
    if (!clerkId) throw new Error('Unauthorized');

    const userId = await getOrCreateUser();
    if (!userId) throw new Error('User sync failed');

    const { error } = await supabase
        .from('thinking_artifacts')
        .delete()
        .match({ id, user_id: userId });

    if (error) throw new Error(error.message);
    return true;
}
