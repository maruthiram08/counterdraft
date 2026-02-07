'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function updatePlan(id: string, updates: any) {
    const { error } = await supabase
        .from('access_plans')
        .update(updates)
        .eq('id', id);

    if (error) throw new Error(error.message);
    revalidatePath('/plans');
}

export async function createPlan(data: any) {
    const { error } = await supabase
        .from('access_plans')
        .insert(data);

    if (error) throw new Error(error.message);
    revalidatePath('/plans');
}
