
import { NextRequest, NextResponse } from 'next/server';
import { voiceService } from '@/lib/voice/service';
import { getOrCreateUser } from '@/lib/user-sync';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { id } = body;

        if (!id) return NextResponse.json({ error: "Profile ID required" }, { status: 400 });

        const profile = await voiceService.setActiveProfile(userId, id);
        return NextResponse.json({ success: true, profile });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
