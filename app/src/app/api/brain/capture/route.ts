import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { getOrCreateUser } from '@/lib/user-sync';
import { getOpenAI } from '@/lib/openai';

export const maxDuration = 60; // Allow 60s for AI/Storage

export async function POST(req: NextRequest) {
    try {
        // 1. Auth Check (Relies on Cookie/Session)
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return NextResponse.json({ error: 'Unauthorized. Please log in to CounterDraft.' }, { status: 401 });
        }

        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'User sync failed' }, { status: 500 });
        }

        // 2. Parse Payload
        const body = await req.json();
        const { imageBase64, userNote, intentType, sourceUrl, sourceTitle, pageTitle, isBookmark } = body;

        if (!imageBase64 && !isBookmark && intentType !== 'bookmark' && intentType !== 'pin') {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        // 3. Skip Storage Upload (User Request)
        const imagePath = null;

        // 4. AI Processing (OCR + Analysis)
        let ocrText = "";
        let aiMetadata = {};

        if (imageBase64) {
            const openai = getOpenAI();
            const systemPrompt = `
You are an expert reading assistant. A user has captured a snippet from a website ("${intentType}").
Goal: Extract text and extract intelligence for a Knowledge Graph.

Return JSON:
{
  "ocr_text": "The exact text in the image",
  "cleaned_text": "The text with typos fixed and formatting preserved",
  "entities": ["Elon Musk", "Tesla", "Economics", "Berlin"],
  "tags": ["Finance", "Technology"],
  "key_insight": "A one-sentence summary of the core idea.",
  "analysis": {
      "tone": "Academic/Casual/etc",
      "rhetoric": ["Metaphor", "Data", "etc"]
  }
}
`;
            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: systemPrompt },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: `User Note: "${userNote}". Context: ${pageTitle}` },
                            { type: "image_url", image_url: { url: imageBase64 } }
                        ]
                    }
                ],
                response_format: { type: "json_object" }
            });

            const aiResult = JSON.parse(response.choices[0].message.content || "{}");
            ocrText = aiResult.ocr_text || "";
            aiMetadata = aiResult;
        } else {
            // No Image (Bookmark Mode)
            // We could run a text-only classification on the title/note, but for now just save.
            aiMetadata = { type: 'bookmark', note: userNote };
        }

        // Helper for safe domain extraction
        let domain = 'unknown';
        try {
            if (sourceUrl) {
                domain = new URL(sourceUrl).hostname;
            }
        } catch (e) {
            console.warn("Invalid Source URL:", sourceUrl);
        }

        // 5. Save to Database
        const { data: artifact, error: dbError } = await supabase
            .from('thinking_artifacts')
            .insert({
                user_id: userId,
                source_url: sourceUrl || "",
                source_title: sourceTitle || pageTitle,
                source_domain: domain,
                image_path: imagePath,
                ocr_text: ocrText,
                user_note: userNote,
                intent_type: intentType || 'example',
                ai_metadata: aiMetadata
            })
            .select()
            .single();

        if (dbError) throw dbError;

        return NextResponse.json({ success: true, artifact });

    } catch (error: any) {
        console.error('[POST /api/brain/capture] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
