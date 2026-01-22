import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getOrCreateUser } from '@/lib/user-sync';

export const dynamic = 'force-dynamic';

// Lazy load OpenAI to prevent build-time errors if env vars are missing
const getOpenAI = () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not defined');
    }
    return new OpenAI({ apiKey });
};

export async function POST(req: Request) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, hook, angle, deep_dive, outline, references, userContext, currentText, type, brainMetadata } = await req.json();

        // Format references for inclusion in prompts
        const formatReferences = (refs: any[] | undefined): string => {
            if (!refs || refs.length === 0) return '';
            const formattedRefs = refs.map((ref, i) => {
                if (ref.referenceType === 'link') return `[${i + 1}] URL: ${ref.url}`;
                else return `[${i + 1}] ${ref.title || 'Reference'}:\n${ref.content?.substring(0, 2000) || ''}`;
            }).join('\n\n');
            return `\n\nUser-provided references to consider:\n${formattedRefs}`;
        };

        if (action === 'deep_dive') {
            // Step 1: Research and analyze the topic
            const referencesContext = formatReferences(references);
            const userContextString = userContext ? `\n\nAdditional User Context/Instructions:\n${userContext}` : '';
            const brainContext = brainMetadata
                ? `\n\nStrategic Context (To be applied ONLY to Key Insights):\n- Goal: ${brainMetadata.outcome || 'General'}\n- Stance: ${brainMetadata.stance || 'Balanced'}\n- Audience: ${brainMetadata.audience?.role || 'General Professional'} (Pain Point: ${brainMetadata.audience?.pain || 'General challenges'})`
                : '';

            const completion = await getOpenAI().chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are a research assistant helping a thought leader prepare content.
Given a topic hook, angle, and optional reference materials, provide:

1. Research findings: A comprehensive, OBJECTIVE list of facts, statistics, historical context, or modern trends. These findings should be "Domain Broad"—providing a sturdy foundation of truth regardless of the final audience. Do not limit the number artificially; cover the topic thoroughly.

2. Key insights: Strategic synthesis of the topic. UNLIKE the findings, these must be heavily TAILORED to the provided Strategic Context (Goal, Stance, and Audience). Find the "So What?" for this specific audience and project goal.${brainContext}

Respond in JSON format:
{
  "research": ["fact 1", "fact 2", ...],
  "insights": ["insight 1", "insight 2", ...]
}`
                    },
                    {
                        role: 'user',
                        content: `Topic: ${hook}\nAngle: ${angle || 'General exploration'}${referencesContext}${userContextString}`
                    }
                ],
                response_format: { type: 'json_object' },
            });

            const result = JSON.parse(completion.choices[0].message.content || '{}');
            return NextResponse.json({ deep_dive: result });

        } else if (action === 'refine_point') {
            // New Action: Refine a single research point
            const userContextString = userContext ? `\n\nUser Instructions:\n${userContext}` : '';

            const completion = await getOpenAI().chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are a research editor. Refine the given ${type || 'research point'} based on the user's feedback.
Return a JSON object with a single key "text".
Example: { "text": "Updated research point..." }`
                    },
                    {
                        role: 'user',
                        content: `Current Text: "${currentText}"${userContextString}`
                    }
                ],
                response_format: { type: 'json_object' },
            });

            const result = JSON.parse(completion.choices[0].message.content || '{}');
            return NextResponse.json({ refined: result.text });

        } else if (action === 'outline') {
            // Step 2: Generate post outline
            const brainContext = brainMetadata
                ? `\n\nStrategic Context:\n- Goal: ${brainMetadata.outcome}\n- Audience: ${brainMetadata.audience?.role} (Pain: ${brainMetadata.audience?.pain})\n- Stance: ${brainMetadata.stance}\n- Format: ${brainMetadata.format || 'Thought Leadership'}`
                : '';

            const completion = await getOpenAI().chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are a content strategist creating a COMPREHENSIVE content outline.
Given a topic and research, create a detailed, granular outline that fully covers the subject.
- Do NOT limit the number of sections. Use as many as needed (e.g., 7-12 points) to cover all research findings.
- Ensure the structure supports a deep-dive "Source of Truth" document.
- Each section should be a clear instruction or sub-header.

IMPORTANT: Return a JSON object with a "sections" key containing an array of strings.
{ "sections": ["Section 1", "Section 2", ..., "Section N"] }${brainContext}`
                    },
                    {
                        role: 'user',
                        content: `Topic: ${hook}\nAngle: ${angle || 'General'}\n\nResearch:\n${deep_dive?.research?.map((r: any) => {
                            const text = typeof r === 'string' ? r : r.text;
                            const notes = r.notes && r.notes.length ? `\n   > USER NOTES: ${r.notes.join('; ')}` : '';
                            return `- ${text}${notes}`;
                        }).join('\n') || 'None'}\n\nInsights:\n${deep_dive?.insights?.map((i: any) => {
                            const text = typeof i === 'string' ? i : i.text;
                            const notes = i.notes && i.notes.length ? `\n   > USER NOTES: ${i.notes.join('; ')}` : '';
                            return `- ${text}${notes}`;
                        }).join('\n') || 'None'}`
                    }
                ],
                response_format: { type: 'json_object' },
            });

            let result;
            try {
                result = JSON.parse(completion.choices[0].message.content || '{}');
            } catch (e) {
                console.error("Failed to parse outline JSON", e);
                result = {};
            }

            // Ensure we extract sections as array of strings
            let sections: string[] = [];

            // Primary path: sections key
            if (result.sections && Array.isArray(result.sections)) {
                sections = result.sections.map((s: any) => typeof s === 'string' ? s : String(s));
            } else if (Array.isArray(result)) {
                // Fallback: direct array
                sections = result.map((s: any) => typeof s === 'string' ? s : String(s));
            } else {
                // Last resort: treat object values as sections
                sections = Object.values(result).filter(v => typeof v === 'string') as string[];
            }

            return NextResponse.json({ outline: { sections } });

        } else if (action === 'draft') {
            // Step 3: Generate full draft from outline

            // Unrestricted Depth Logic (Source of Truth)
            const format = brainMetadata?.format || 'thought_leadership';

            let styleInstruction = "- detailed paragraphs, deep analysis, authority-driven tone";
            if (format === 'tactical_guide') {
                styleInstruction = "- focus on clear, actionable steps\n- include examples for every step";
            } else if (format === 'personal_story') {
                styleInstruction = "- focus on emotion and vulnerable storytelling\n- use dramatic pacing";
            } else if (format === 'listicle') {
                styleInstruction = "- punchy, short sentences\n- maximize readability";
            }

            const brainContext = brainMetadata
                ? `\n\nStrategic Context:\n- Goal: ${brainMetadata.outcome}\n- Audience: ${brainMetadata.audience?.role} (Pain: ${brainMetadata.audience?.pain})\n- Stance: ${brainMetadata.stance}\n- Format: ${format}`
                : '';

            const completion = await getOpenAI().chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert LinkedIn content writer.
Write a COMPREHENSIVE LinkedIn post based on the given outline.
- This is the "Source of Truth" document. Do NOT summarize or cut content.
- Fully explore each point in the outline.
- Use as many words as necessary to be thorough.
- Use short paragraphs for readability, but keep the TOTAL CONTENT substantial.
- Make it personal and authentic.
- End with a question or CTA.
${styleInstruction}${brainContext}`
                    },
                    {
                        role: 'user',
                        content: `Topic: ${hook}\n\nOutline (Follow this EXACTLY):\n${outline?.map((s: any, i: number) => {
                            const text = typeof s === 'string' ? s : s.text;
                            const notes = s.notes && s.notes.length ? `\n   > USER INSTRUCTIONS FOR THIS SECTION: ${s.notes.join('; ')}` : '';
                            return `${i + 1}. ${text}${notes}`;
                        }).join('\n') || 'Write a compelling post'}`
                    }
                ],
            });

            const draft = completion.choices[0].message.content || '';
            return NextResponse.json({ draft });

        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

    } catch (err: any) {
        console.error('Development API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
