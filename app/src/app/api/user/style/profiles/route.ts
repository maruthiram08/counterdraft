
import { NextRequest, NextResponse } from 'next/server';
import { voiceService } from '@/lib/voice/service';
import { getOrCreateUser } from '@/lib/user-sync';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const profiles = await voiceService.getProfiles(userId);
        return NextResponse.json({ profiles });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name } = body;

        if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

        const profile = await voiceService.createProfile(userId, name);
        return NextResponse.json({ profile });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
