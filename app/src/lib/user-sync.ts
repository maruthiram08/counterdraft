import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from './supabase-admin';

// Rows created before we knew the user's email got a placeholder like clerk_user_123@counterdraft.app
export function isPlaceholderEmail(email: string | null | undefined): boolean {
    return !email || (email.startsWith('clerk_') && email.endsWith('@counterdraft.app'));
}

type EmailEntry = { id: string; email: string; verified: boolean };

/** The primary email if verified, otherwise any verified one. Unverified emails are never used for linking. */
export function pickVerifiedEmail(emails: EmailEntry[], primaryId?: string | null): string | null {
    const verified = emails.filter(e => e.verified && e.email);
    const primary = verified.find(e => e.id === primaryId);
    return (primary || verified[0])?.email.toLowerCase() || null;
}

// Escape LIKE wildcards so ilike works as a case-insensitive equals ("_" is common in emails)
function likeExact(value: string): string {
    return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

type ClerkProfile = { clerkId: string; email: string | null; name?: string | null; avatarUrl?: string | null };

/**
 * Find the Supabase user for a Clerk user, re-linking by verified email when the Clerk id is new.
 *
 * Clerk ids change when moving from the development to the production instance, while all our data
 * hangs off users.id. If no row has this clerk_id but one has the same verified email, that row is
 * re-pointed at the new clerk_id instead of creating an empty duplicate account.
 */
export async function linkOrCreateUser(profile: ClerkProfile): Promise<string | null> {
    const { clerkId, email, name, avatarUrl } = profile;

    const { data: byClerk, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('clerk_id', clerkId)
        .maybeSingle();

    if (fetchError) {
        console.error('linkOrCreateUser: Failed to fetch user:', fetchError);
        return null;
    }

    if (byClerk) {
        // Backfill the real email so this row can be re-linked later
        if (email && isPlaceholderEmail(byClerk.email)) {
            const { error } = await supabaseAdmin.from('users').update({ email }).eq('id', byClerk.id);
            if (error) console.warn('linkOrCreateUser: Could not backfill email:', error.message);
        }
        return byClerk.id;
    }

    if (email) {
        const { data: byEmail } = await supabaseAdmin
            .from('users')
            .select('id, clerk_id')
            .ilike('email', likeExact(email))
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (byEmail) {
            const { error } = await supabaseAdmin
                .from('users')
                .update({ clerk_id: clerkId, updated_at: new Date().toISOString() })
                .eq('id', byEmail.id);
            if (!error) {
                console.log('linkOrCreateUser: Re-linked existing user to new Clerk id', { userId: byEmail.id, from: byEmail.clerk_id, to: clerkId });
                return byEmail.id;
            }
            console.error('linkOrCreateUser: Re-link failed, creating a new user:', error);
        }
    }

    console.log('linkOrCreateUser: Creating new user for', clerkId);
    const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
            email: email || `clerk_${clerkId}@counterdraft.app`,
            clerk_id: clerkId,
            name: name || 'Counterdraft User',
            ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        })
        .select('id')
        .single();

    if (createError) {
        console.error('Error creating user:', createError);
        return null;
    }

    return newUser.id; // Return internal Supabase ID
}

// Clerk ids whose email backfill already failed in this instance, so we don't call Clerk on every request
const backfillTried = new Set<string>();

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

    // Fast path: known user with a real email (no Clerk API call)
    const { data: existingUser, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('clerk_id', userId)
        .maybeSingle();

    if (fetchError) {
        console.error('getOrCreateUser: Failed to fetch user:', fetchError);
        return null;
    }

    if (existingUser && (!isPlaceholderEmail(existingUser.email) || backfillTried.has(userId))) {
        // Return INTERNAL ID - all foreign keys reference users.id
        return existingUser.id;
    }

    // New Clerk id, or a row still holding a placeholder email: ask Clerk who this is
    let email: string | null = null;
    let name: string | null = null;
    let avatarUrl: string | null = null;
    try {
        const user = await currentUser();
        if (user) {
            email = pickVerifiedEmail(
                user.emailAddresses.map(e => ({ id: e.id, email: e.emailAddress, verified: e.verification?.status === 'verified' })),
                user.primaryEmailAddressId
            );
            name = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
            avatarUrl = user.imageUrl || null;
        }
    } catch (e) {
        console.warn('getOrCreateUser: Could not load Clerk profile:', e);
    }

    if (existingUser) backfillTried.add(userId);

    return linkOrCreateUser({ clerkId: userId, email, name, avatarUrl });
}
