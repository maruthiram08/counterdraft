import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        const { code, planId, maxUses, discount } = await req.json();

        if (!code || !planId) {
            return NextResponse.json({ error: 'Code and Plan ID are required' }, { status: 400 });
        }

        // Insert into coupons table
        const { data, error } = await supabase
            .from('coupons')
            .insert({
                code: code.toUpperCase(),
                plan_id: planId,
                max_redemptions: maxUses || 100,
                discount_percent: discount || 100, // Default to 100% off (free beta)
                is_active: true,
                redemptions_count: 0
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating coupon:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
