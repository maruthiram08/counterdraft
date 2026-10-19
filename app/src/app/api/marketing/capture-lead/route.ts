import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
    try {
        const ip = getClientIp(req);
        const limit = rateLimit(`capture-lead:${ip}`, { windowMs: 60 * 60 * 1000, max: 30 });
        if (!limit.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: { 'Retry-After': String(limit.retryAfter || 60) } }
            );
        }

        const { email, source = 'homepage_audit', metadata = {} } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Public endpoint (no user session): write with the service-role client
        const { error } = await supabase
            .from('marketing_leads')
            .insert([
                {
                    email,
                    source,
                    metadata
                }
            ]);

        if (error) {
            console.error('Lead Capture Error:', error);
            return NextResponse.json({ error: 'Failed to capture lead' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error('API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
