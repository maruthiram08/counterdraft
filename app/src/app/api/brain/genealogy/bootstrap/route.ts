import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { brainService } from '@/lib/brain/service';
import { getOrCreateUser } from '@/lib/user-sync';

export async function POST(req: NextRequest) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // 1. Fetch all existing beliefs for this user
        const { data: beliefs, error: fetchError } = await supabaseAdmin
            .from('beliefs')
            .select('id, statement, belief_type')
            .eq('user_id', userId);

        if (fetchError) {
            throw fetchError;
        }

        if (!beliefs || beliefs.length === 0) {
            return NextResponse.json({ message: 'No beliefs found to bootstrap.', count: 0 });
        }

        // Map database fields to what the service expects
        const mappedBeliefs = beliefs.map(b => ({
            id: b.id,
            statement: b.statement,
            type: b.belief_type
        }));

        // 2. Run Batch Genealogy
        const result = await brainService.bootstrapGenealogy(mappedBeliefs);

        // 3. Persist the links (Updates parent_id and root_id)
        // We do this in one-off updates for now to be safe
        for (const link of result.links) {
            await supabaseAdmin
                .from('beliefs')
                .update({
                    parent_id: link.parentId,
                    // If it's linked to root, indicate that too for faster querying in v1
                    updated_at: new Date().toISOString()
                })
                .eq('id', link.childId);
        }

        // Mark roots explicitly (set parent_id to null)
        for (const rootId of result.roots) {
            await supabaseAdmin
                .from('beliefs')
                .update({
                    parent_id: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', rootId);
        }

        return NextResponse.json({
            message: 'Genealogy bootstrapped successfully',
            beliefCount: beliefs.length,
            rootsFound: result.roots.length,
            linksCreated: result.links.length
        });

    } catch (error: any) {
        console.error('GENEALOGY_BOOTSTRAP_ERROR', error);
        return new NextResponse(error.message || 'Internal Error', { status: 500 });
    }
}
