import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getOrCreateUser } from '@/lib/user-sync';
import { TraceLogger } from '@/lib/trace';
import { moderateContent, getModerationErrorMessage } from '@/lib/moderation';
import { SAFETY_PREAMBLE } from '@/lib/openai';
import { UsageService } from '@/lib/billing/usage';
import { voiceService } from '@/lib/voice/service';

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

        const { action, hook, angle, deep_dive, outline, references, userContext, currentText, type, brainMetadata, draft, fix_instruction } = await req.json();

        // 🛡️ CONTENT MODERATION CHECK (on user-provided text fields)
        const inputToModerate = [hook, angle, userContext, currentText].filter(Boolean).join(' ');
        if (inputToModerate) {
            const modResult = await moderateContent(inputToModerate);
            if (modResult.flagged) {
                return NextResponse.json({
                    error: getModerationErrorMessage(modResult),
                    flagged: true,
                    categories: modResult.categories
                }, { status: 400 });
            }
        }

        // Format references for inclusion in prompts
        const formatReferences = (refs: any[] | undefined): string => {
            if (!refs || refs.length === 0) return '';
            const formattedRefs = refs.map((ref, i) => {
                if (ref.referenceType === 'link') return `[${i + 1}] URL: ${ref.url}`;
                else return `[${i + 1}] ${ref.title || 'Reference'}:\n${ref.content || ''}`;
            }).join('\n\n');
            return `\n\nUser-provided references to consider:\n${formattedRefs}`;
        };

        if (action === 'deep_dive') {
            // Check Limit
            const limit = await UsageService.checkSearchLimit(userId);
            if (!limit.allowed) {
                return NextResponse.json({
                    error: 'Search Limit Reached',
                    message: limit.reason,
                    usage: limit,
                    upgradeUrl: '/pricing'
                }, { status: 403 });
            }

            // Step 1: Research and analyze the topic
            const referencesContext = formatReferences(references);
            const userContextString = userContext ? `\n\nAdditional User Context/Instructions:\n${userContext}` : '';

            // NEW: Use source context if available (e.g. from Artifacts) to ground the research
            const sourceMaterial = brainMetadata?.sourceContext
                ? `\n\nSOURCE MATERIAL (Use this as the primary ground truth):\n${brainMetadata.sourceContext}`
                : '';

            const brainContext = brainMetadata
                ? `\n\nStrategic Context (To be applied ONLY to Key Insights):\n- Goal: ${brainMetadata.outcome || 'General'}\n- Stance: ${brainMetadata.stance || 'Balanced'}\n- Audience: ${brainMetadata.audience?.role || 'General Professional'} (Pain Point: ${brainMetadata.audience?.pain || 'General challenges'})`
                : '';

            // LOGGING: Verify content is being passed to LLM
            console.log('[/api/content/develop] Deep dive prompt context:', {
                hook,
                referencesContextLength: referencesContext.length,
                sourceMaterialLength: sourceMaterial.length,
                hasSourceMaterial: !!brainMetadata?.sourceContext,
                sourceContextChars: brainMetadata?.sourceContext?.length || 0
            });

            TraceLogger.log('deep_dive', 'Research Phase Input', {
                hook,
                sourceMaterialPreview: sourceMaterial.substring(0, 200) + '...',
                fullSourceLength: sourceMaterial.length
            });

            const completion = await getOpenAI().chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `${SAFETY_PREAMBLE}

You are an editorial strategist helping a creator develop a strong piece of writing.

You are given:
- A core idea or topic (the "hook")
- An angle or editorial direction
- Optional reference materials (URLs, notes, saved artifacts)
- Audience context (who they are, their stance, and pain points)
- The creator's intended viewpoint (e.g., exploratory, opinionated, contrarian)
- The desired article format${brainContext}

Your task is to provide:

1. **Research findings**: A comprehensive, OBJECTIVE list of facts, statistics, historical context, or modern trends. These should be "domain broad" — providing a sturdy foundation of truth regardless of final framing. Cover the topic thoroughly without artificial limits.

2. **Key insights**: Strategic synthesis TAILORED to the provided audience and stance. Find the "So What?" — surface tensions, tradeoffs, or overlooked implications relevant to this specific audience.

Prioritize:
- Insights that reframe the problem from the audience's perspective
- Points that clarify or sharpen the creator's intended stance
- Findings that go beyond restating references or obvious talking points
- Evidence that turns scattered references into a coherent point of view

Avoid:
- Generic or broadly agreeable observations
- High-level summaries without specific value
- Trend-chasing or engagement bait disguised as insight

INSTRUCTIONS ON SOURCE MATERIAL:
- The User's "Hook" and "Angle" are the NORTH STAR. Frame everything through this lens.
- If SOURCE MATERIAL is provided, treat it as PRIMARY EVIDENCE to support the user's angle.
- If the Source Material's tone differs from the Angle, aggressively mine the source for relevant facts to support the REQUESTED angle.
- You MAY supplement with external knowledge if the source is too narrow, but do not hallucinate specific data points.

IMPORTANT: Return a valid JSON object with the following structure:
{
  "research": ["list of strings containing facts"],
  "insights": ["list of strings containing strategic insights"]
}`
                    },
                    {
                        role: 'user',
                        content: `Topic: ${hook}\nAngle: ${angle || 'General exploration'}${referencesContext}${sourceMaterial}${userContextString}`
                    }
                ],
                response_format: { type: 'json_object' },
            });

            const result = JSON.parse(completion.choices[0].message.content || '{}');

            // Increment Usage
            await UsageService.incrementSearchCount(userId);

            // Add AI disclaimer to response
            return NextResponse.json({
                deep_dive: result,
                disclaimer: "AI-generated content. Please verify facts and statistics before publishing."
            });

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
            // Check Limit (AI Outliner)
            const limitCheck = await UsageService.checkDraftLimit(userId);
            if (!limitCheck.allowed) {
                return NextResponse.json({
                    error: 'Limit Reached',
                    message: limitCheck.reason,
                    tier: limitCheck.tier,
                    upgradeUrl: '/pricing'
                }, { status: 403 });
            }

            // Step 2: Generate post outline
            const brainContext = brainMetadata
                ? `\n\nStrategic Context:\n- Goal: ${brainMetadata.outcome}\n- Audience: ${brainMetadata.audience?.role} (Pain: ${brainMetadata.audience?.pain})\n- Stance: ${brainMetadata.stance}\n- Format: ${brainMetadata.format || 'Thought Leadership'}`
                : '';

            // NEW: Include references and source context for outline step
            const referencesContext = formatReferences(references);
            const sourceContext = brainMetadata?.sourceContext
                ? `\n\nOriginal Source Material:\n${brainMetadata.sourceContext.substring(0, 3000)}...`
                : '';

            const completion = await getOpenAI().chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are an editorial strategist creating a comprehensive, development-ready outline for a serious piece of writing.

You are given:
- A defined topic or idea
- Completed research (sources, notes, findings)
- Audience context (who they are and what they care about)
- The intended stance and article format${brainContext}

Your task is to produce a detailed, logically structured outline that can serve as a single source of truth for writing.

Outline requirements:
- Use as many sections as necessary to fully cover the subject (typically 7–12, but not capped).
- The structure must guide the reader from context → insight → implication, not just list information.
- Each section must represent a distinct idea, argument, or analytical step — not filler.
- Avoid redundancy; consolidate overlapping points.
- Order sections intentionally so the argument or narrative builds with momentum.

For each section:
- Write a clear, specific heading or instruction (not vague titles).
- Indicate what question this section answers or what role it plays.
- Reflect synthesis of the research, not raw summaries.

Prioritize:
- Sections that clarify the core problem or tension
- Logical grouping of research into meaningful themes
- Depth over breadth — explain what matters most, not everything found
- Alignment with the audience's perspective and the creator's stance

Avoid:
- Outline sections that merely restate sources
- Generic headings (e.g., "Introduction", "Background", "Conclusion") unless they carry a clear purpose
- Over-fragmentation into shallow points
- Treating the outline as a table of contents instead of a thinking scaffold

IMPORTANT: Return a JSON object with a "sections" key containing an array of strings.
{ "sections": ["Section 1", "Section 2", ..., "Section N"] }`
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
                        }).join('\n') || 'None'}${referencesContext}${sourceContext}`
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

            const extractText = (s: any) => {
                if (typeof s === 'string') return s;
                if (typeof s === 'object' && s !== null) {
                    return s.title || s.heading || s.section || s.text || s.name || JSON.stringify(s);
                }
                return String(s);
            };

            // Primary path: sections key
            if (result.sections && Array.isArray(result.sections)) {
                sections = result.sections.map(extractText);
            } else if (Array.isArray(result)) {
                // Fallback: direct array
                sections = result.map(extractText);
            } else {
                // Last resort: treat object values as sections
                sections = Object.values(result).filter(v => typeof v === 'string') as string[];
            }

            return NextResponse.json({ outline: { sections } });

        } else if (action === 'draft') {
            // Check Limit (AI Writer)
            const limitCheck = await UsageService.checkDraftLimit(userId);
            if (!limitCheck.allowed) {
                return NextResponse.json({
                    error: 'Limit Reached',
                    message: limitCheck.reason,
                    tier: limitCheck.tier,
                    upgradeUrl: '/pricing'
                }, { status: 403 });
            }

            // Step 3: Generate full draft from outline
            const format = brainMetadata?.format || 'thought_leadership';

            // 🎙️ VOICE INJECTION
            let voiceContext = '';
            try {
                const profile = await voiceService.getProfile(userId);
                if (profile && profile.is_active) {
                    const rulesList = profile.rules?.map(r => `- ${r}`).join('\n') || '';
                    const antiList = profile.anti_patterns?.map(r => `- AVOID: ${r}`).join('\n') || '';

                    voiceContext = `
\n\nUSER WRITING STYLE GUIDELINES:
- **Tone:** ${profile.voice_tone}
- **Style Rules:**
${rulesList}
- **Anti-Patterns (Do Not Use):**
${antiList}
`;
                    console.log(`[Draft] Injected Voice Profile: ${profile.voice_tone}`);
                }
            } catch (e) {
                console.warn("Failed to load voice profile:", e);
            }

            // 3.1. ENHANCE MANUAL SECTIONS (Ad-hoc Depth)
            // If the user added manual outline points, they might be shallow ("Talk about X").
            // We need to expand them into "depth points" before drafting so the AI has material to work with.

            let enhancedOutline = [...(outline || [])];

            // Check for manual/shallow sections (heuristic: short text, no research attached, or flagged isNew)
            // For now, we'll process ALL sections to ensure uniform depth, but prioritize "new" ones.
            // Actually, for speed, let's just do a quick pass to "flesh out" the outline into a "Drafting Brief".

            const outlineContext = outline?.map((s: any, i: number) => {
                const text = typeof s === 'string' ? s : s.text;
                const notes = s.notes && s.notes.length ? `[User Notes: ${s.notes.join('; ')}]` : '';
                return `Section ${i + 1}: ${text} ${notes}`;
            }).join('\n');

            // Intermediate Step: "Drafting Brief" generation
            // This asks the AI to plan the *arguments* for each section before writing the prose.
            const briefCompletion = await getOpenAI().chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are an editorial architect. 
The user has provided an outline for a post. Some sections might be vague or manually added.
Your job is to expand each outline point into a "Key Argument & Depth" brief.

For each section:
1. Clarify the core argument (what are we saying?)
2. Add 1-2 specific points of depth (examples, counter-arguments, or nuanced observations)
3. Ensure manual sections (which might just be a title) get enough substance to fit the flow.

Keep it concise but dense. This is for the writer, not the reader.`
                    },
                    {
                        role: 'user',
                        content: `Topic: ${hook}
Angle: ${angle}
Stance: ${brainMetadata?.stance || 'Opinionated'}

Outline:
${outlineContext}

Expand this into a drafting brief.`
                    }
                ]
            });
            const draftingBrief = briefCompletion.choices[0].message.content || outlineContext;


            // Richer format-specific style instructions
            let styleInstruction = '';
            if (format === 'thought_leadership') {
                styleInstruction = `Format: Thought Leadership
- Lead with a clear, considered point of view
- Support claims with reasoning, not just assertion
- Balance authority with intellectual humility
- Develop ideas with depth, but cut anything that doesn't sharpen the argument`;
            } else if (format === 'tactical_guide') {
                styleInstruction = `Format: Tactical Guide
- Open with the problem this guide solves
- Each step must be concrete and actionable
- Include brief examples or context for non-obvious steps
- Prioritize clarity and utility over narrative flair`;
            } else if (format === 'personal_story') {
                styleInstruction = `Format: Personal Story
- Ground the story in a specific moment or scene
- Use sensory details and emotional honesty
- Let the insight emerge from the narrative, don't over-explain
- Pacing matters: slow down at key moments, compress transitions`;
            } else if (format === 'listicle') {
                styleInstruction = `Format: Listicle
- Each item must deliver standalone value
- Vary rhythm: mix punchy one-liners with slightly developed points
- Avoid padding; if an item is weak, cut it
- The list should feel curated, not exhaustive`;
            }

            const brainContext = brainMetadata
                ? `\n\nStrategic Context:\n- Goal: ${brainMetadata.outcome}\n- Audience: ${brainMetadata.audience?.role} (Pain: ${brainMetadata.audience?.pain})\n- Stance: ${brainMetadata.stance}`
                : '';

            // Include all user context that was available during research
            const referencesContext = formatReferences(references);
            const userContextString = userContext ? `\n\nUser's Special Instructions:\n${userContext}` : '';
            const sourceContext = brainMetadata?.sourceContext
                ? `\n\nOriginal Source Material (for reference/citations):\n${brainMetadata.sourceContext.substring(0, 2000)}...`
                : '';

            // Log all context being passed to draft
            TraceLogger.log('draft', 'Draft Generation Context', {
                hook,
                angle: angle || 'None',
                format,
                hasUserContext: !!userContext,
                hasReferences: !!references?.length,
                hasSourceContext: !!brainMetadata?.sourceContext,
                outlineSections: outline?.length || 0,
            });

            const completion = await getOpenAI().chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `${SAFETY_PREAMBLE}

You are an editorial writer creating a definitive LinkedIn article.

You are given:
- A "Drafting Brief" which expands the outline into key arguments (Use this as your roadmap)
- Research context and references
- Audience context and pain points
- The creator's intended stance and tone
${brainContext}

**CRITICAL STRATEGIC INSTRUCTION:**
You must write specifically for the defined **Audience** (${brainMetadata?.audience?.role || 'Professionals'}) and address their specific **Pain Point** (${brainMetadata?.audience?.pain || 'Challenges'}).
- If the stance is **Contrarian**, do not hedge. Be bold.
- If the goal is **Trust**, rely on evidence, not hype.
- **Fail Condition:** Do not write a generic "thought leadership" post. If the content could apply to anyone, it is a failure. It must feel specific to THIS audience.

Your task is to write a **complete, high-quality LinkedIn post** that fully develops the brief into a coherent, persuasive piece.

Writing requirements:
- Treat the Drafting Brief as authoritative: every major section must be meaningfully developed.
- Do NOT compress the points into a summary.
- Do NOT pad with filler or restate the same idea in different words.
- Be thorough where depth matters; be concise where clarity benefits.
- Every paragraph must earn its place. If a section could be cut without weakening the argument, it shouldn't exist.

Style & voice:
- **ADOPT THE USER'S VOICE:** ${voiceContext ? 'Strictly follow the guidelines below.' : 'Write in a natural, human voice.'}
${voiceContext}
- Use short paragraphs for LinkedIn readability, but allow ideas to breathe.
- Make reasoning explicit: explain *why* things matter, not just *what* happened.
- Avoid clichés, generic advice, and motivational fluff.
- If appropriate, acknowledge uncertainty or nuance rather than forcing certainty.

Structure:
- Open with a strong, thoughtful hook that frames the core idea or tension.
- Progress logically through the brief so the argument or narrative builds.
- Use bold text sparingly for emphasis or visual breaks where it aids scannability.
- Use line spacing intentionally to guide the reader through complex ideas.
- End with a reflective question or light CTA that invites discussion, not engagement bait.

Constraints:
- This is a LinkedIn post — keep formatting native to the platform.
- Do NOT use markdown headers (#), emojis, or formal section labels.
- Do NOT reference the outline, research process, or AI assistance.

Goal:
Produce a post that feels like the creator sat down, thought deeply, and wrote their most considered take on the subject — something they would be proud to attach their name to.

${styleInstruction}`
                    },
                    {
                        role: 'user',
                        content: `Topic: ${hook}
Angle: ${angle || 'General exploration'}

DRAFTING BRIEF (Follow this structure):
${draftingBrief}

${referencesContext}${sourceContext}${userContextString}`
                    }
                ],
            });

            const draft = completion.choices[0].message.content || '';
            return NextResponse.json({ draft });

        } else if (action === 'verify_strategy') {
            // Step 4: Verify Draft Strategy Alignment


            // Use explicitly passed draft matching the frontend payload, or fallback to currentText
            const textToVerify = draft || currentText;

            if (!textToVerify || !brainMetadata) {
                return NextResponse.json({ error: 'Missing draft content or strategy metadata' }, { status: 400 });
            }

            const strategyContext = `
Strategic Goals:
- Outcome: ${brainMetadata.outcome || 'General Engagement'}
- Audience: ${brainMetadata.audience?.role || 'General Audience'} (Pain: ${brainMetadata.audience?.pain || 'Unknown'})
- Stance: ${brainMetadata.stance || 'Neutral'}
- Format: ${brainMetadata.format || 'Post'}
            `;

            const completion = await getOpenAI().chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are a strict Editorial Strategy Coach.
Your specific job is to measure the "Strategic Alignment" of a piece of content.

You are given:
1. A Draft Post
2. The Strategic Intent (Goal, Audience, Stance)

Your task:
Analyze strictly whether the draft achieves the specific intent.
- Does it actually speak to the defined Audience (using their language, addressing their specific pain)?
- Does it maintain the promised Stance (e.g. if "Contrarian", is it actually bold? If "Empathetic", is it warm?)?
- Does it drive toward the Goal?

Output JSON:
{
  "score": number (0-100),
  "critique": "A concise, 2-sentence summary of the main strategic gap. Be direct.",
  "strengths": ["string", "string"], (Max 2 key things they did well)
  "weaknesses": ["string", "string"], (Max 2 key conceptual failures)
  "actionable_fix": "One specific, high-impact instruction to fix the biggest issue."
}`
                    },
                    {
                        role: 'user',
                        content: `STRATEGY:\n${strategyContext}\n\nDRAFT CONTENT:\n${textToVerify}`
                    }
                ],
                response_format: { type: 'json_object' },
            });

            const result = JSON.parse(completion.choices[0].message.content || '{}');
            return NextResponse.json(result);

        } else if (action === 'auto_fix_strategy') {
            // Step 5: Surgically Auto-Fix the Draft
            console.log("🔧 Auto-Fix Request Received"); // Force Rebuild
            console.log("Draft length:", draft?.length);
            console.log("Fix Instruction:", fix_instruction);
            console.log("Brain Metadata:", JSON.stringify(brainMetadata));

            if (!draft || !fix_instruction) {
                console.error("❌ Missing required fields for auto-fix");
                return NextResponse.json({ error: 'Missing draft or fix instruction' }, { status: 400 });
            }

            try {
                const completion = await getOpenAI().chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a Surgical Editor specializing in "Do No Harm" revisions.
       
       OBJECTIVE:
       The user's draft has a specific flaw: "${fix_instruction}"
       Your job is to fix THIS FLAW ONLY while leaving the rest of the text EXACTLY as is.
       
       STRATEGIC CONTEXT:
       - Audience: ${brainMetadata?.audience?.role || 'Professionals'}
       - Goal: ${brainMetadata?.outcome || 'Engagement'}
       
       CRITICAL RULES:
       1. **Identify the Weakness:** Locate the specific 1-2 paragraphs or sentences that violate the critique.
       2. **Surgical Strike:** Rewrite ONLY those specific parts to be stronger (bolder, more specific, data-driven).
       3. **Copy-Paste the Rest:** For every other paragraph that is already fine, COPY IT WORD-FOR-WORD. Do not "polish" what isn't broken.
       4. **Output:** Return the FULL text (original parts + fixed parts).`
                        },
                        {
                            role: 'user',
                            content: `DRAFT:\n${draft}`
                        }
                    ]
                });

                const refinedDraft = completion.choices[0].message.content || draft;
                return NextResponse.json({ draft: refinedDraft });

            } catch (error) {
                console.error("Auto-Fix Failed:", error);
                return NextResponse.json({ error: 'Auto-fix generation failed' }, { status: 500 });
            }


        } else if (action === 'verify_facts') {
            // Step 6: Fact Check
            const textToVerify = draft || currentText;
            if (!textToVerify) return NextResponse.json({ error: 'Missing text' }, { status: 400 });

            const completion = await getOpenAI().chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are a Fact Checking Agent.
Your job is to extract specific claims from the text and verify them against your training data and logical consistency.

Output JSON:
{
  "facts": [
    {
      "claim": "Extract the specific claim found in text",
      "verdict": "Verified" | "Disputed" | "Unverified",
      "analysis": "Brief explanation of why.",
      "sourceSnippet": "Optional: valid verification context or citation if known."
    }
  ]
}

- Mark "Verified" only if it is generally accepted fact.
- Mark "Disputed" if it is controversial or factually wrong.
- Mark "Unverified" if it is niche, personal data, or vague.
- Ignore opinions, subjective statements (e.g., "AI is the future"), or general advice. Focus on verifiable assertions.`
                    },
                    {
                        role: 'user',
                        content: `TEXT TO CHECK:\n${textToVerify}`
                    }
                ],
                response_format: { type: 'json_object' },
            });

            const result = JSON.parse(completion.choices[0].message.content || '{}');
            return NextResponse.json(result);

        } else if (action === 'autofill_strategy') {
            // Step 7: Strategy Autofill based on Voice
            const profile = await voiceService.getProfile(userId);

            let voiceContext = "No specific voice profile found. Suggest a generic high-performing strategy.";
            if (profile && profile.is_active) {
                voiceContext = `USER VOICE TONE: ${profile.voice_tone}\nRULES: ${profile.rules?.join(', ')}`;
            }

            const completion = await getOpenAI().chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are a Strategic Editorial Advisor.
Your job is to suggest the optimal "Content Strategy" for a specific topic, aligned with the user's natural voice.

INPUTS:
- Topic: ${hook}
- User Voice: ${voiceContext}

TASK:
Determine the best fit for:
1. Audience (Who cares most about this? What is their specific pain?)
2. Goal (Engagement, Authority, Conversion?)
3. Stance (Contrarian, Analytical, Visionary, Supportive?)
4. Format (Listicle, Story, Guide, Thought Leadership?)

LOGIC:
- If Voice is "Cynical/Direct", Stance should likely be "Contrarian".
- If Voice is "Empathic/Warm", Stance should be "Supportive".
- If Topic is technical, Format might be "Tactical Guide".
- If Topic is personal, Format might be "Personal Story".

Output JSON:
{
  "audience": { "role": "Specific Role", "pain": "Specific Challenge" },
  "outcome": "authority" | "engagement" | "conversion" | "connection",
  "stance": "String",
  "format": "thought_leadership" | "tactical_guide" | "personal_story" | "listicle"
}`
                    },
                    { role: 'user', content: `Topic: ${hook}` }
                ],
                response_format: { type: 'json_object' }
            });

            const result = JSON.parse(completion.choices[0].message.content || '{}');
            return NextResponse.json(result);

        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

    } catch (err: any) {
        console.error('Development API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
