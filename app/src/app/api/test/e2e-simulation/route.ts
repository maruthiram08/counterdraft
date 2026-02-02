
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { refineSearchQuery } from '@/lib/openai';
import { fetchGoogleNewsRSS } from '@/app/api/explore/feed/route';
import { TraceLogger } from '@/lib/trace';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const inputQuery = searchParams.get('q') || "Use moltbot for productivity";
    const explicitIntent = searchParams.get('intent') || "General";

    const trace: any[] = [];
    const runId = Date.now();

    try {
        trace.push({ step: "INIT", query: inputQuery, intent: explicitIntent, runId });
        TraceLogger.log('test_runner', `Starting Test Scenario: "${inputQuery}"`, { intent: explicitIntent });

        // 0. Mock User
        const { data: user } = await supabaseAdmin.from('users').select('id').limit(1).single();
        const userId = user?.id;
        if (!userId) throw new Error("No test user found");

        // 1. Refine & Search
        trace.push({ step: "1. SEARCH", input: inputQuery });
        const refinedQueries = await refineSearchQuery(inputQuery);
        const activeQuery = refinedQueries[0];
        const feed = await fetchGoogleNewsRSS(activeQuery);

        if (feed.length === 0) throw new Error("No news found");
        const targetArticle = feed[0];
        trace.push({ step: "2. RESULT", title: targetArticle.title, url: targetArticle.link });

        // 3. Idea Gen (Contextualized)
        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: "You are a content strategist. Generate 1 post idea as JSON: { ideas: [{ hook, angle, format }] }" },
                { role: "user", content: `Generate idea for: "${targetArticle.title}". Context/User Intent: "${inputQuery}. INTENT: ${explicitIntent}"` }
            ],
            model: "gpt-4o",
            response_format: { type: "json_object" },
        });
        const ideas = JSON.parse(completion.choices[0].message.content || "{}").ideas || [];
        const selectedIdea = ideas[0];
        trace.push({ step: "3. IDEA", hook: selectedIdea.hook });
        TraceLogger.log('explore', 'Generated Ideas (Simulation)', { ...selectedIdea, requestedIntent: explicitIntent });

        // 4. Scrape (Mocked for speed/reliability in test)
        let scrapedText = "";
        try {
            const response = await fetch(targetArticle.link, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            scrapedText = (await response.text()).substring(0, 5000);
        } catch (e) { scrapedText = "Content scrape failed, using fallback mock text for extraction test."; }

        // 5. Deep Dive (The North Star Test)
        const prompt = `You are a research assistant.
INSTRUCTIONS ON SOURCE MATERIAL:
- The User's "Hook" and "Angle" are the NORTH STAR. Frame everything through this lens.
- If SOURCE MATERIAL is provided, treat it as PRIMARY EVIDENCE to support the user's angle.
- If the Source Material's tone differs from the Angle (e.g. Source is "Fear" but Angle is "Productivity"), aggressively mine the source for relevant facts to support the REQUESTED angle.
- You MAY supplement the Source Material with external knowledge if the source is too narrow, but do not hallucinate specific data points.

IMPORTANT: Return a valid JSON object with the following structure:
{
  "research": ["facts"],
  "insights": ["insights"]
}`;

        TraceLogger.log('deep_dive', `Executing LLM [Intent: ${explicitIntent}]...`, { hook: selectedIdea.hook });

        const deepDiveCompletion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: prompt },
                { role: 'user', content: `Topic: ${selectedIdea.hook}\nAngle: ${selectedIdea.angle}\n\nSOURCE MATERIAL:\n${scrapedText.substring(0, 2000)}` }
            ],
            response_format: { type: 'json_object' },
        });

        const result = JSON.parse(deepDiveCompletion.choices[0].message.content || '{}');
        TraceLogger.log('deep_dive', 'LLM Result', result);

        trace.push({ step: "COMPLETE", insightsPreview: result.insights?.[0] });

        return NextResponse.json({ success: true, trace });

    } catch (e: any) {
        return NextResponse.json({ error: e.message, stack: e.stack, trace });
    }
}
