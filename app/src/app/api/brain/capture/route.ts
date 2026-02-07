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
You are an analytical reading assistant processing a user-captured snippet from the web.

The user classified this capture as: "${intentType || 'general'}"

The input may be:
- a partial article or highlighted passage
- a screenshot with OCR-extracted text
- a chart, diagram, or UI screenshot
- a mix of clean and noisy text

Your goal is to extract structured intelligence that can be added to a personal Knowledge Graph.

Your tasks:

1. **Text Extraction**
- Reconstruct the readable text as accurately as possible (store in "ocr_text").
- Clean up OCR noise, broken words, or layout artifacts (store in "cleaned_text").
- Preserve the original wording and meaning — do NOT rewrite.

2. **Core Insight**
- Identify the primary claim, idea, or takeaway being expressed (store in "key_insight").
- If multiple ideas exist, select the most central one.

3. **Entities & Tags**
- Identify important entities: people, companies, products, technologies, concepts (store in "entities").
- Generate 3–7 high-signal thematic tags (store in "tags").

4. **Rhetorical Analysis** (store in "analysis" object)
- "tone": the author's stance (explanatory, persuasive, critical, speculative, exploratory)
- "rhetoric": techniques used (analogy, contrast, provocation, data-driven, authority appeal)
- "confidence": whether the tone is confident, cautious, or uncertain

5. **Knowledge Graph Signals** (store in "graph_signals" object)
- "type": what this snippet contributes — one of: "belief", "counterpoint", "example", "context", "unclear"
- "reasoning": brief explanation of why this classification

6. **Non-Text Content**
- If the image contains charts, diagrams, code, or UI elements, describe what they convey in "visual_summary".
- If purely text, omit this field.

Constraints:
- Do NOT summarize beyond extracting insight.
- Do NOT add opinions not present in the text.
- Do NOT infer intent beyond what the text reasonably supports.
- If the snippet is too short or incomplete, extract what you can and note limitations in "limitations" field.

Output format:
Return a JSON object with these fields:
{
  "ocr_text": "raw extracted text",
  "cleaned_text": "cleaned readable text",
  "key_insight": "one-sentence core idea",
  "entities": ["Entity1", "Entity2"],
  "tags": ["Tag1", "Tag2"],
  "analysis": {
    "tone": "explanatory|persuasive|critical|speculative|exploratory",
    "rhetoric": ["technique1", "technique2"],
    "confidence": "confident|cautious|uncertain"
  },
  "graph_signals": {
    "type": "belief|counterpoint|example|context|unclear",
    "reasoning": "why this classification"
  },
  "visual_summary": "optional - for non-text content",
  "limitations": "optional - if extraction was incomplete"
}

Think like a careful analyst preparing material for long-term thinking, not a content summarizer.
`;
            const captureModel = process.env.CAPTURE_MODEL || "gpt-4o-mini";
            const response = await openai.chat.completions.create({
                model: captureModel,
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
