
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getOrCreateUser } from '@/lib/user-sync';

export async function PATCH(req: NextRequest) {
    try {
        const userId = await getOrCreateUser();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { role, context, voice_tone, onboarding_completed } = body;

        // Update object
        const updateData: any = {
            onboarding_completed: onboarding_completed ?? true,
            updated_at: new Date().toISOString()
        };

        if (role) updateData.role = role;
        if (context) updateData.context = context;
        if (voice_tone) updateData.voice_tone = voice_tone;

        const { error } = await supabaseAdmin
            .from('users')
            .update(updateData)
            .eq('id', userId);

        if (error) {
            console.error('Error updating profile:', error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Profile update failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
