import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
    try {
        const ip = getClientIp(req);
        const limit = rateLimit(`feedback:${ip}`, { windowMs: 60 * 60 * 1000, max: 30 });
        if (!limit.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: { 'Retry-After': String(limit.retryAfter || 60) } }
            );
        }

        const body = await req.json();
        const { content, page_url, user_id, email, metadata } = body;

        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('user_feedback')
            .insert({
                content,
                page_url,
                user_id,
                email,
                metadata
            });

        if (error) {
            console.error('Feedback insert error:', error);
            return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
        }

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (e) {
        console.error('Feedback API error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
