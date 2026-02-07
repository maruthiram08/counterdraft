import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
    try {
        const ip = getClientIp(req);
        const limit = rateLimit(`waitlist:${ip}`, { windowMs: 60 * 60 * 1000, max: 30 });
        if (!limit.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: { 'Retry-After': String(limit.retryAfter || 60) } }
            );
        }

        const { email, source } = await req.json();

        if (!email || !email.includes('@')) {
            return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
        }

        // Check if already exists to provide friendly message
        // (RLS policy allows insert, but we want to be nice UI-wise)
        const { data: existing } = await supabaseAdmin
            .from('waitlist')
            .select('id')
            .eq('email', email)
            .single();

        if (existing) {
            return NextResponse.json({ message: "You are already on the list! We'll be in touch." }, { status: 200 });
        }

        const { error } = await supabaseAdmin
            .from('waitlist')
            .insert({
                email,
                source: source || 'direct',
                status: 'pending'
            });

        if (error) {
            console.error('Waitlist insert error:', error);
            return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 });
        }

        return NextResponse.json({ message: "You're in. Welcome to the inner circle." }, { status: 200 });

    } catch (e) {
        console.error('Waitlist API error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
