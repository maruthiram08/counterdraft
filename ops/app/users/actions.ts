'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

// Approving a beta request mints a single-use free invite and returns its link to send
export async function approveRequest(id: string): Promise<{ code: string; link: string }> {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const random = Array.from(crypto.getRandomValues(new Uint8Array(10)), b => alphabet[b % alphabet.length]).join('');
    const code = `BETA-${random}`;
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const { error: couponError } = await supabase
        .from('coupons')
        .insert({
            code,
            plan_id: 'pro_beta_2026',
            max_redemptions: 1,
            redemptions_count: 0,
            discount_percent: 100,
            expires_at: expiresAt,
        });
    if (couponError) throw new Error(couponError.message);

    const { error } = await supabase
        .from('beta_requests')
        .update({ status: 'approved' })
        .eq('id', id);

    if (error) throw new Error(error.message);
    revalidatePath('/users');
    return { code, link: `https://counterdraft.com/invite/${code}` };
}

export async function rejectRequest(id: string) {
    const { error } = await supabase
        .from('beta_requests')
        .update({ status: 'rejected' })
        .eq('id', id);

    if (error) throw new Error(error.message);
    revalidatePath('/users');
}

export async function extendSubscription(userId: string, additionalDays: number) {
    // 1. Get current sub
    const { data: sub } = await supabase
        .from('subscriptions')
        .select('current_period_end')
        .eq('user_id', userId)
        .single();

    if (!sub) throw new Error("Subscription not found");

    const currentEnd = new Date(sub.current_period_end);
    const newEnd = new Date(currentEnd);
    newEnd.setDate(newEnd.getDate() + additionalDays);

    const { error } = await supabase
        .from('subscriptions')
        .update({ current_period_end: newEnd.toISOString() })
        .eq('user_id', userId);

    if (error) throw new Error(error.message);
    revalidatePath('/users');
}
