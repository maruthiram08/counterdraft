import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { isCaptureIntent, isCaptureKind } from '@/lib/brain/captures';
import { storeCaptureImage } from '@/lib/brain/capture-images';
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
        // Lens 1.0.2+ sends the text of a framed element; a tall screenshot gets scaled down before the model reads it
        const pageText = typeof body.pageText === 'string' ? body.pageText.trim().slice(0, 10000) : '';
        // Lens 1.0.3 says which tool made the capture; for older versions a frame is the one that sends page text
        const kind = isCaptureKind(body.captureKind)
            ? body.captureKind
            : !imageBase64 ? 'bookmark' : pageText ? 'frame' : 'snip';

        if (!imageBase64 && !isBookmark && intentType !== 'bookmark' && intentType !== 'pin') {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        // 3. Keep the image, so charts and screenshots can be seen again (a failed upload still saves the capture)
        const imagePath = imageBase64 ? await storeCaptureImage(userId, imageBase64) : null;

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
- Transcribe every word of the visible text exactly as written, from the first line to the last, in "ocr_text".
- Never summarise, shorten, reword or finish a sentence yourself. If a word is unreadable, write [unclear] instead of guessing.
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
                            ...(pageText ? [{
                                type: "text" as const,
                                text: `Text copied from the captured part of the page. Treat it as the exact wording for ocr_text and cleaned_text, and use the image for layout and visuals:\n---\n${pageText}\n---`
                            }] : []),
                            // "high" reads the image in full; "auto" can shrink it so far that the model guesses at the words
                            { type: "image_url", image_url: { url: imageBase64, detail: "high" } }
                        ]
                    }
                ],
                response_format: { type: "json_object" }
            });

            const aiResult = JSON.parse(response.choices[0].message.content || "{}");
            // The model rewords and cuts long text even when given the exact copy, so keep the page's own words
            ocrText = pageText || aiResult.ocr_text || "";
            aiMetadata = { ...(pageText ? { ...aiResult, ocr_text: pageText } : aiResult), kind };
        } else {
            // Bookmark: Lens 1.0.3 sends the article text read in the browser, so it is ready for ideas and drafting
            ocrText = pageText;
            aiMetadata = { type: 'bookmark', kind: 'bookmark', note: userNote };
        }

        // Helper for safe domain extraction
        let domain = 'unknown';
        try {
            if (sourceUrl) {
                domain = new URL(sourceUrl).hostname;
            }
        } catch {
            console.warn("Invalid Source URL:", sourceUrl);
        }

        // 5. Save to Database
        // Intent is optional; a capture saved without one is just "saved"
        const intent = isCaptureIntent(intentType) ? intentType : null;
        const row = {
            user_id: userId,
            source_url: sourceUrl || "",
            source_title: sourceTitle || pageTitle,
            source_domain: domain,
            image_path: imagePath,
            ocr_text: ocrText,
            user_note: userNote,
            intent_type: intent,
            ai_metadata: { ...aiMetadata, ...(intent ? { intent } : {}) }
        };
        let { data: artifact, error: dbError } = await supabase.from('thinking_artifacts').insert(row).select().single();
        // Until migration 20261027_capture_style_intent runs, the intent_type check rejects 'style'; it is kept in ai_metadata
        if (dbError?.code === '23514' && intent) {
            ({ data: artifact, error: dbError } = await supabase.from('thinking_artifacts').insert({ ...row, intent_type: null }).select().single());
        }

        if (dbError) throw dbError;

        return NextResponse.json({ success: true, artifact });

    } catch (error: unknown) {
        console.error('[POST /api/brain/capture] Error:', error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
