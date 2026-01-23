import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Init Supabase Admin Client (for writing to DB without user auth)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: Request) {
    try {
        const { email, source = 'homepage_audit', metadata = {} } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // We use a direct Supabase client here because this is a public endpoint
        // and the user is NOT authenticated yet.
        // Ideally, use a SERVICE_ROLE_KEY client if RLS protects this table.
        // For now, assuming we use the standard client but the table permits insert.
        // SECURITY NOTE: In prod, ensure RLS allows public INSERT or use Service Key.

        // Using Service Key for reliable ingestion bypassing RLS if needed for leads
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
