
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { extractBeliefs } from "@/lib/brain/analysis";
import { getOrCreateUser } from "@/lib/user-sync";
import { storeAnalysisResults } from "@/lib/belief-storage";

export async function POST(req: Request) {
    try {
        const { content, source = "linkedin", isInspiration = false, inspirationAuthor } = await req.json();

        if (!content || typeof content !== "string") {
            return NextResponse.json({ error: "Content is required" }, { status: 400 });
        }

        const isMockMode = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder');
        let userId: string | null = null;

        if (!isMockMode) {
            // 1. Get authenticated user from Clerk
            userId = await getOrCreateUser();

            if (!userId) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

            // 2. Insert Content into raw_posts
            const { error: insertError } = await supabaseAdmin
                .from("raw_posts")
                .insert({
                    user_id: userId,
                    content,
                    source,
                    is_inspiration: isInspiration,
                    inspiration_author: inspirationAuthor,
                });

            if (insertError) {
                console.error("Error inserting post:", insertError);
                return NextResponse.json({ error: "Failed to store content" }, { status: 500 });
            }
        } else {
            console.warn("⚠️ Running in Mock DB Mode (Placeholder Credentials detected)");
        }

        // 3. Trigger Analysis using GLM
        try {
            console.log("Starting analysis with content length:", content.length);
            const analysis = await extractBeliefs([content]);

            if (!isMockMode && userId) {
                // 4. Store Beliefs & Tensions via shared service
                await storeAnalysisResults(userId, analysis);
            }

            return NextResponse.json({
                success: true,
                message: isMockMode ? "Analyzed (DB Skipped)" : "Ingested & Analyzed", // Verified by finding this message response
                debug: analysis
            });

        } catch (aiError: unknown) {
            console.error("AI Extraction failed:", aiError);

            // Fallback for local verification if AI is out of credits or fails.
            // Only used in mock DB mode so real accounts never receive placeholder beliefs.
            const errorMessage = String(aiError);
            const isQuotaError = errorMessage.includes("429") || errorMessage.includes("1113") || errorMessage.includes("insufficient");
            if (isMockMode && isQuotaError) {
                console.warn("⚠️ AI Account Insufficient Balance. Using Mock Analysis.");

                const mockAnalysis = {
                    coreBeliefs: ["Simplicity reveals truth", "Complexity hides bugs", "Minimum viable strategy", "Subtract to add value"],
                    overusedAngles: ["More features is better", "Scale at all costs"],
                    emergingThesis: "Radical subtraction as a growth strategy",
                    detectedTensions: [
                        { beliefA: "Simplicity", beliefB: "Nuance", summary: "Simple isn't always true" }
                    ]
                };

                return NextResponse.json({
                    success: true,
                    message: "Analyzed (Mock Fallback)",
                    debug: mockAnalysis
                });
            }

            return NextResponse.json({ error: "AI Processing Failed", details: errorMessage }, { status: 500 });
        }

    } catch (error: unknown) {
        console.error("Ingestion API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
