import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from './supabase-admin';

/**
 * Get or create a Supabase user based on Clerk auth
 * Returns the Supabase user ID
 */
export async function getOrCreateUser(): Promise<string | null> {
    const { userId } = await auth();

    if (!userId) {
        console.warn('getOrCreateUser: No userId from auth()');
        return null;
    }

    // Check if user exists in Supabase by clerk_id
    const { data: existingUser, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('clerk_id', userId)
        .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('getOrCreateUser: Failed to fetch user:', fetchError);
        return null;
    }

    if (existingUser) {
        // Return INTERNAL ID - all foreign keys reference users.id
        return existingUser.id;
    }

    console.log('getOrCreateUser: Creating new user for', userId);

    // Get user details from Clerk and create in Supabase
    // For now, use clerk_id as email placeholder
    const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
            email: `clerk_${userId}@counterdraft.app`,
            clerk_id: userId,
            name: 'Counterdraft User',
        })
        .select('id')
        .single();

    if (createError) {
        console.error('Error creating user:', createError);
        return null;
    }

    return newUser.id; // Return internal Supabase ID
}
