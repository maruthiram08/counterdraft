import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-sync";
import { voiceService } from "@/lib/voice/service";

export async function POST(req: NextRequest) {
    try {
        const userId = await getOrCreateUser();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { samples } = await req.json();

        if (!samples || !Array.isArray(samples) || samples.length === 0) {
            return NextResponse.json({ error: "No samples provided" }, { status: 400 });
        }

        // Analyze via VoiceService (LLM)
        const analysis = await voiceService.analyzeSamples(userId, samples);

        return NextResponse.json(analysis);

    } catch (error: any) {
        console.error("[Style Analysis Error]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
