'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function approveRequest(id: string) {
    const { error } = await supabase
        .from('beta_requests')
        .update({ status: 'approved' })
        .eq('id', id);

    if (error) throw new Error(error.message);
    revalidatePath('/users');
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
