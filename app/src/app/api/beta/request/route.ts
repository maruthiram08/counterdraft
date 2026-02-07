import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { moderateContent } from '@/lib/moderation';

export async function POST(req: NextRequest) {
    try {
        const { email, name, linkedin_url, reason } = await req.json();

        // 1. Basic Validation
        if (!email || !linkedin_url || !reason) {
            return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
        }

        // 2. Moderation (Optional, but good for "reason")
        const modResult = await moderateContent(reason);
        if (modResult.flagged) {
            return NextResponse.json({ error: "Content flagged." }, { status: 400 });
        }

        // 3. Insert into Supabase
        const { error } = await supabaseAdmin
            .from('beta_requests')
            .insert({
                email,
                name: name || '',
                linkedin_url,
                reason,
                status: 'pending'
            });

        if (error) {
            console.error("Beta Request DB Error:", error);
            // Handle unique constraint (optional)
            if (error.code === '23505') { // Unique violation
                return NextResponse.json({ success: true, message: "Already requested." }); // Idempotent success
            }
            return NextResponse.json({ error: "Database error." }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (e) {
        console.error("Beta Request Error:", e);
        return NextResponse.json({ error: "Server error." }, { status: 500 });
    }
}
