import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/user-sync';
import { voiceService } from '@/lib/voice/service';

type StyleProfileUpdate = Partial<{
    voice_tone: string;
    rules: string[];
    anti_patterns: string[];
}>;

export async function GET() {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const profile = await voiceService.getProfile(userId);

        return NextResponse.json({
            profile: profile || null
        });

    } catch (error: unknown) {
        console.error("[Style API Error]:", error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await voiceService.deleteProfile(userId);

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("[Style API DELETE Error]:", error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const updates = await req.json();

        // Validate allowed fields
        const allowedUpdates = ['voice_tone', 'rules', 'anti_patterns'];
        const cleanUpdates: StyleProfileUpdate = {};

        for (const key of allowedUpdates) {
            if (updates[key as keyof typeof updates] !== undefined) {
                cleanUpdates[key] = updates[key];
            }
        }

        if (Object.keys(cleanUpdates).length === 0) {
            return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
        }

        const updatedProfile = await voiceService.updateProfile(userId, cleanUpdates);

        return NextResponse.json({ profile: updatedProfile });

    } catch (error: unknown) {
        console.error("[Style Update Error]:", error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
