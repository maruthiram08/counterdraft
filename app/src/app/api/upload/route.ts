import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getOrCreateUser } from '@/lib/user-sync';
import crypto from 'crypto';

// POST /api/upload - Upload file to storage
export async function POST(req: Request) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // 1. Validation limits
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain', 'text/markdown'];

        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File too large (Max 10MB)' }, { status: 413 });
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type' }, { status: 415 });
        }

        // Sanitize filename
        const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueId = crypto.randomUUID();
        const path = `${userId}/${uniqueId}-${filename}`;

        // Convert file to ArrayBuffer for upload
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        const { data, error } = await supabaseAdmin
            .storage
            .from('references')
            .upload(path, buffer, {
                contentType: file.type,
                upsert: false
            });

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabaseAdmin
            .storage
            .from('references')
            .getPublicUrl(path);

        return NextResponse.json({
            success: true,
            url: publicUrl,
            path: data.path,
            type: file.type,
            name: file.name
        });

    } catch (err: any) {
        console.error('Upload API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
