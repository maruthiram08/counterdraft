import { openai } from '@/lib/openai';
import { TraceLogger } from '@/lib/trace';
import { SAFETY_PREAMBLE } from '@/lib/openai';
import { voiceService } from '@/lib/voice/service';
import { BrainMetadata, ContentReference, DeepDiveData, OutlineItem, ResearchItem, InsightItem } from '@/types';
import { formatExploreSources, formatIdeaChain, formatStrategyContext, originAngle, originQuery, normalizeFormat, sanitizeParsedStrategy, ParsedStrategy, outlineShape, STRATEGY_CRITERIA, StrategyCriterion, scoreCriteria, totalScore, weakestCriterion } from './strategy';
import { anchorQueries, countLocalFindings, dropUnknownCitations, sharesKeyWords, fallbackQueries, formatWebSources, gatherWebSources } from './webResearch';

type ResearchPlan = { queries: string[]; asks?: { question: string; query: string }[]; place?: string; country?: string; localTerms?: string[]; placeIsWholeBrief?: boolean };

// Interfaces for standardized inputs/outputs
export interface DeepDiveParams {
    userId: string;
    hook: string;
    angle?: string;
    references?: ContentReference[];
    userContext?: string;
    brainMetadata?: BrainMetadata;
}

export interface DeepDiveResult {
    research: string[];
    insights: string[];
    webSources?: number; // How many live web results the research had; 0 means it ran on the model's memory alone
}

export interface OutlineParams {
    userId: string;
    hook: string;
    angle?: string;
    references?: ContentReference[];
    deep_dive?: DeepDiveData;
    userContext?: string;
    brainMetadata?: BrainMetadata;
}

export interface DraftParams {
    userId: string;
    hook: string;
    angle?: string;
    outline?: OutlineItem[];
    deep_dive?: DeepDiveData;
    references?: ContentReference[];
    userContext?: string;
    brainMetadata?: BrainMetadata;
}

export interface StrategyVerificationResult {
    score: number;
    critique: string;
    strengths: string[];
    weaknesses: string[];
    actionable_fix: string;
    criteria: StrategyCriterion[];
}

// The last check of an earlier version, so a re-check after a fix judges the change, not a fresh draft
export interface PreviousStrategyCheck {
    criteria?: { key: string; rating: number; note?: string }[];
    fix?: string;
}

export interface FactCheckResult {
    facts: Array<{
        claim: string;
        verdict: 'Verified' | 'Disputed' | 'Unverified';
        analysis: string;
        sourceSnippet?: string;
    }>;
}

export class BrainGenerationService {
    // Shared client: a missing key fails at request time, not at import time
    private openai = openai;

    private formatReferences(refs: ContentReference[] | undefined): string {
        if (!refs || refs.length === 0) return '';
        const formattedRefs = refs.map((ref, i) => {
            if (ref.referenceType === 'link') return `[${i + 1}] URL: ${ref.url}`;
            else return `[${i + 1}] ${ref.title || 'Reference'}:\n${ref.content || ''}`;
        }).join('\n\n');
        return `\n\nUser-provided references to consider:\n${formattedRefs}`;
    }

    // --- 1. Deep Dive (Research) ---
    async generateDeepDive({ hook, angle, references, userContext, brainMetadata }: DeepDiveParams): Promise<DeepDiveResult> {
        const referencesContext = this.formatReferences(references);
        const userContextString = userContext ? `\n\nAdditional User Context/Instructions:\n${userContext}` : '';

        const sourceMaterial = brainMetadata?.sourceContext
            ? `\n\nSOURCE MATERIAL (Use this as the primary ground truth):\n${brainMetadata.sourceContext}`
            : '';

        const brainContext = formatStrategyContext(brainMetadata, 'Strategic Context (decides what is worth researching; keep the facts themselves objective)');
        const ideaChain = formatIdeaChain({ hook, angle, meta: brainMetadata });

        // Ground research in live web results aimed at where the whole chain meets the brief
        const exploreSources = formatExploreSources(brainMetadata);
        // Plan from the original search and saved angle first; the hook is only a working title
        const origin = originQuery(brainMetadata);
        const searchSeed = `${origin ? `\nOriginal search: ${origin}` : ''}\nSaved angle: ${originAngle(angle, brainMetadata) || 'None'}`;
        const plan = await this.planResearchQueries(hook, `${searchSeed}${ideaChain}${brainContext}${exploreSources}`)
            .catch((): ResearchPlan => ({ queries: fallbackQueries(hook, brainMetadata, angle) }));
        // Each "must include" item gets its own search so the brief's extra asks aren't crowded out by the hook
        const includeQueries = (brainMetadata?.include || []).slice(0, 2).map(item => plan.place && !item.toLowerCase().includes(plan.place.toLowerCase().slice(0, 4)) ? `${item} ${plan.place}` : item);
        const askQueries = (plan.asks || []).map(a => a.query);
        const queries = [...new Set([...anchorQueries([...plan.queries, ...askQueries], brainMetadata, plan.place), ...includeQueries])];
        const asks = (plan.asks || []).map(a => a.question);
        const asksBlock = asks.length ? `\n\nTHE BRIEF'S QUESTIONS (each needs at least two findings of its own, or a "Gap:" finding):\n${asks.map(a => `- ${a}`).join('\n')}` : '';
        const sources = await gatherWebSources(queries, 15, plan.country);
        const webSources = `${exploreSources}${formatWebSources(sources)}`;

        TraceLogger.log('deep_dive', 'Research Phase Input', {
            hook,
            sourceMaterialPreview: sourceMaterial.substring(0, 200) + '...',
            fullSourceLength: sourceMaterial.length,
            queries,
            webSourceCount: sources.length
        });

        const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
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

1. **Research findings**: The raw material the planned post needs. Choose WHAT to research from the strategic context and the creator's brief: what this audience would find credible, specifics about their pain points, anything the creator asked to include, and the material the format calls for (for a practical walkthrough or guide: concrete use cases, the steps or workflow, before/after comparisons, worked examples, and limitations or when NOT to use it).
   - Each finding must be a specific, checkable fact, example or step. Opinions, predictions and "this can help X" claims belong in Key insights, not here.
   - If the whole brief is about a country, region or culture, most findings must be about that place: its laws and policies, named local companies and brands, family set-ups, work culture, prices. Advice that would apply to anyone anywhere (a dedicated workspace, exercise, a schedule, "focus on authenticity") does not count unless it is made specific to that place. If the place is one part of the brief, that part still gets its own place-specific findings. If the sources have too little local material, add a "Gap:" finding naming what is missing instead of padding with generic material.
   - Every "Must include" item and every extra ask in the brief (e.g. "also talk about how Indian D2C brands identify the shift and plan around it") gets at least two findings of its own with specifics: named companies or people, numbers, what they did and what happened. When the brief asks HOW someone does something, findings describe the method (what they track or measure, the steps they took, the result), not just that it happens.
   - A statistic about one country or group must say which (e.g. "In South Korea, 92% of Gen Z..."); never present it as if it applied to the brief's audience or place.
   - Every finding must be specific to the brief's audience and any place or culture it names. A general finding counts only once it is made specific to them (for Indian dads: joint families, paternity leave at named companies, long workdays across time zones); otherwise drop it.
   - If the brief asks for tips, practical advice or a how-to, most findings must be concrete actions the reader can take this week: what to do, when, and how, with a real example where the sources give one (e.g. "Block 7 to 8pm as no-laptop time and tell your manager in writing", not "create an organized home office").
   - Never repeat the same point twice.
   - Prefer strong sources: news outlets, journals and research, surveys, government and established organisations, named experts. Use a personal blog only for a first-hand story, and say it is one person's experience.
   - Include the numbers the sources give (survey results, percentages, counts, dates). A finding with a figure beats one that says "many" or "increasingly".
   - When the brief asks what someone can do, give concrete actions recommended by named experts or organisations (e.g. a child psychologist's advice), one action per finding.
   - Base findings on the EXPLORE SOURCES, WEB SOURCES, references and source material provided. End each sourced finding with the domain shown in brackets after that source's title, e.g. "(source: hbr.org)"; never a paraphrased title or site name.
   - Never mention a study, statistic or institution that is not in the provided material. If the sources cannot support something the post needs, say so as its own finding starting with "Gap:" (e.g. "Gap: no published pricing; confirm before citing") instead of inventing it.

2. **Key insights**: Strategic synthesis TAILORED to the provided audience and stance. Find the "So What?" — surface tensions, tradeoffs, or overlooked implications relevant to this specific audience.
   Each insight must be something the post can use directly: a claim to argue, a reframe the reader hasn't heard, or a way to structure the post. Never summarise the findings or say the audience "needs support", "should prioritise" or "might reconsider" something.
   Write each as a sharp, arguable statement that cites the findings it rests on. Weak: "Parents might reconsider K-pop as an opportunity for nurturing." Strong: "The fandom gives teens the emotional vocabulary their homes don't; parents who learn one song's story get a way into conversations they can't start head-on."

Prioritize:
- Insights that reframe the problem from the audience's perspective
- Points that clarify or sharpen the creator's intended stance
- Findings that go beyond restating references or obvious talking points
- Evidence that turns scattered references into a coherent point of view

Avoid:
- Generic or broadly agreeable observations
- High-level summaries without specific value
- Trend-chasing or engagement bait disguised as insight
- Insights that restate a finding or another insight in different words

INSTRUCTIONS ON SOURCE MATERIAL:
- The creator's brief and strategic context are the NORTH STAR. Where they differ from the Hook or Angle (for example the hook is about creativity but the brief asks for a practical walkthrough), follow the brief.
- Treat HOW THIS IDEA CAME TO BE as one connected chain: the original search, the source, the saved idea and the brief each narrow the one before. Research must serve the whole chain; drop any point that only fits one link (e.g. a point about the source article that has nothing to do with what the creator was searching for or their brief).
- If the topic or source material is broader than the brief, research where they meet: apply the topic to the brief's audience and their pain (e.g. a topic about "a holistic view of time" with a brief for first-time dads means research on how new fathers experience and manage time across work and family). Drop any finding this audience would not care about.
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
                    content: `Topic: ${hook}\nAngle: ${angle || 'General exploration'}${ideaChain}${brainContext ? `\n\nWHAT THIS POST MUST DO (every finding and insight must serve this):${brainContext}` : ''}${asksBlock}${webSources}${referencesContext}${sourceMaterial}${userContextString}`
                }
            ];
        const run = async () => {
            const completion = await this.openai.chat.completions.create({ model: 'gpt-4o-mini', messages, response_format: { type: 'json_object' } });
            const content = completion.choices[0].message.content || '{}';
            return { content, result: JSON.parse(content) as DeepDiveResult };
        };

        const sourceText = `${webSources}${referencesContext}${sourceMaterial}`;
        const first = await run();
        // The model drifts to generic advice when most sources are from elsewhere; one corrective pass if it did
        const terms = plan.place ? [plan.place, ...(plan.localTerms || [])] : [];
        const findings = Array.isArray(first.result.research) ? first.result.research.map(String) : [];
        const local = countLocalFindings(findings, terms);
        // A post wholly about the place needs half its findings there; one where the place is a side ask needs at least two
        const enough = plan.placeIsWholeBrief === false ? Math.min(2, findings.length) : Math.ceil(findings.length / 2);
        const withSourceCount = (r: DeepDiveResult) => ({ ...r, webSources: sources.length });
        if (!terms.length || !findings.length || local >= enough) return withSourceCount(await this.checkFindingsAgainstSources(first.result, sourceText, asks));

        TraceLogger.log('deep_dive', 'Local retry', { place: plan.place, local, total: findings.length });
        messages.push(
            { role: 'assistant', content: first.content },
            { role: 'user', content: `Only ${local} of ${findings.length} findings are specific to ${plan.place}. Rewrite the research so ${plan.placeIsWholeBrief === false ? `the part of the brief about ${plan.place} has at least two findings of its own` : `most findings are about ${plan.place}`} (laws, policies, named companies and brands, family set-ups, work culture, prices), taken from the sources above. Replace generic material that would apply anywhere with ${plan.place}-specific findings, or with "Gap:" findings naming what the sources lack. Rewrite the insights to match. Same JSON format.` },
        );
        return withSourceCount(await this.checkFindingsAgainstSources((await run().catch(() => first)).result, sourceText, asks));
    }

    // Drops findings whose cited source isn't in the material, then has the model check each one against its source:
    // supported claims stay, overstated ones are cut back to what the source says, unsupported ones go
    // and names any of the brief's questions left without a finding, so a thin result says what's missing
    private async checkFindingsAgainstSources(result: DeepDiveResult, sourceText: string, asks: string[] = []): Promise<DeepDiveResult> {
        const research = Array.isArray(result.research) ? result.research.map(String) : [];
        if (!research.length || !sourceText.trim()) return result;

        const cited = dropUnknownCitations(research, sourceText);
        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You fact-check research findings against the sources they cite. For each numbered finding, find the cited source in the material and decide:
- "supported": the source says this.
- "partial": the source supports part of it (e.g. the finding adds a country, number or claim the source doesn't have). Return "text": the finding cut back to only what the source says, keeping its "(source: ...)" ending.
- "unsupported": the source doesn't say it, or no cited source is in the material.
Findings starting with "Gap:" are always "supported".
Then, for each of the brief's questions, check whether any finding you kept answers it even partly. List in "uncovered", word for word, only the questions that no kept finding touches at all.
Return JSON: { "checks": [{ "i": 0, "verdict": "supported" | "partial" | "unsupported", "text": "..." }], "uncovered": ["..."] }`
                    },
                    { role: 'user', content: `FINDINGS:\n${cited.map((f, i) => `${i}. ${f}`).join('\n')}${asks.length ? `\n\nTHE BRIEF'S QUESTIONS:\n${asks.map(a => `- ${a}`).join('\n')}` : ''}\n\nMATERIAL:${sourceText}` }
                ],
                response_format: { type: 'json_object' },
            });
            const parsed = JSON.parse(completion.choices[0].message.content || '{}') as { checks?: { i?: number; verdict?: string; text?: string }[]; uncovered?: unknown };
            const checks = new Map((parsed.checks || []).map(c => [c.i, c]));
            const verified = cited.flatMap((finding, i) => {
                const check = checks.get(i);
                if (!check) return [finding];
                if (check.verdict === 'unsupported') return [];
                if (check.verdict === 'partial' && check.text?.trim()) return [check.text.trim()];
                return [finding];
            });
            const uncovered = Array.isArray(parsed.uncovered) ? parsed.uncovered.filter((q): q is string => typeof q === 'string' && !!q.trim()) : [];
            // The checker over-reports; only call a question unanswered if no kept finding even touches its key words
            const gaps = uncovered
                .filter(q => !verified.some(f => f.startsWith('Gap:') ? f.includes(q) : sharesKeyWords(f, q)))
                .map(q => `Gap: the sources found don't answer "${q}". Add a reference or your own experience for this part.`);
            TraceLogger.log('deep_dive', 'Source check', { before: research.length, cited: cited.length, after: verified.length, gaps: gaps.length });
            const checked = [...verified, ...gaps];
            return { ...result, research: checked.length ? checked : ['Gap: none of the findings could be confirmed against the sources found; add references or redo research.'] };
        } catch (err) {
            console.error('Source check failed:', err);
            return { ...result, research: cited };
        }
    }

    // Turns the topic and strategy into a few targeted web searches
    private async planResearchQueries(hook: string, context: string): Promise<ResearchPlan> {
        const completion = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `Write 3 web search queries that will find concrete, citable material for a post.
The input describes how the idea came to be (original search, source, saved idea, brief) as one chain. Build the queries from the original search and the saved angle, not the hook alone (the hook is a working title). Aim them at where that whole chain meets the creator's brief and audience (their situation, pain points and the practical material the format needs), not at the topic in the abstract. Explore sources are already in hand, so search for what they don't cover.
Every query must name the brief's audience and any country, region, culture or market the brief mentions (e.g. "Indian dads", "India"); a query about the general topic alone is wasted.
If the brief asks for tips, practical advice or a how-to, search for concrete steps, routines, real examples and local specifics (laws, policies, workplace norms, family set-ups) for that audience, not for statistics or general studies.
Also return "place": the country, region or culture the brief is about, in the words a search should use (e.g. "India"), or null; "country": that country's English name in lowercase if the brief is about one country (e.g. "india"), or null; "placeIsWholeBrief": true if the whole post is about that place, false if the place is only one part of it; "localTerms": up to 8 words that show a sentence is about that place (e.g. ["Indian", "Bengaluru", "joint family", "lakh"]), or []; and "asks": each distinct question the brief wants the post to answer (up to 3, e.g. "what Gen Z thinks" and "what parents can do to help"), each with a web search aimed at answering it for this audience (when the question is what someone can do, aim the search at expert advice, e.g. "child psychologist advice parents K-pop India"), or [] if the brief has none; and "statsQuery": one web search aimed at hard numbers for the topic and place (surveys, reports, statistics), or null.
Return JSON: { "queries": ["...", "...", "..."], "place": "..." | null, "country": "..." | null, "placeIsWholeBrief": true | false, "localTerms": ["..."], "asks": [{ "question": "...", "query": "..." }], "statsQuery": "..." | null }`
                },
                { role: 'user', content: `Working title: ${hook}${context}` }
            ],
            response_format: { type: 'json_object' },
        });
        const parsed = JSON.parse(completion.choices[0].message.content || '{}') as { queries?: unknown; place?: unknown; country?: unknown; localTerms?: unknown; placeIsWholeBrief?: unknown; asks?: unknown; statsQuery?: unknown };
        const queries = Array.isArray(parsed.queries)
            ? parsed.queries.filter((q): q is string => typeof q === 'string' && !!q.trim()).slice(0, 3)
            : [];
        if (!queries.length) throw new Error('No queries planned');
        const text = (v: unknown) => typeof v === 'string' && v.trim() ? v.trim() : undefined;
        const localTerms = Array.isArray(parsed.localTerms) ? parsed.localTerms.map(text).filter((t): t is string => !!t).slice(0, 8) : [];
        const asks = Array.isArray(parsed.asks)
            ? parsed.asks.flatMap(a => {
                const r = (a || {}) as { question?: unknown; query?: unknown };
                const question = text(r.question);
                const query = text(r.query);
                return question && query ? [{ question, query }] : [];
            }).slice(0, 3)
            : [];
        const statsQuery = text(parsed.statsQuery);
        return { queries: statsQuery ? [...queries, statsQuery] : queries, asks, place: text(parsed.place), country: text(parsed.country)?.toLowerCase(), localTerms, placeIsWholeBrief: parsed.placeIsWholeBrief !== false };
    }

    // --- 2. Refine Point ---
    async refineResearchPoint(currentText: string, userContext?: string, type?: string): Promise<string> {
        const userContextString = userContext ? `\n\nUser Instructions:\n${userContext}` : '';

        const completion = await this.openai.chat.completions.create({
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
        return result.text || currentText;
    }

    // Research findings and insights with the user's notes, shared by the outline and the draft
    private formatDeepDive(deep_dive?: DeepDiveData): string {
        const list = (items: (ResearchItem | InsightItem)[] | undefined) => items?.map(r => {
            const text = typeof r === 'string' ? r : r.text;
            const notes = typeof r !== 'string' && r.notes && r.notes.length ? `\n   > USER NOTES: ${r.notes.join('; ')}` : '';
            return `- ${text}${notes}`;
        }).join('\n') || 'None';
        return `Research findings:\n${list(deep_dive?.research)}\n\nInsights:\n${list(deep_dive?.insights)}`;
    }

    // --- 3. Outline ---
    async generateOutline({ hook, angle, deep_dive, references, userContext, brainMetadata }: OutlineParams): Promise<string[]> {
        const ideaChain = formatIdeaChain({ hook, angle, meta: brainMetadata });
        const strategy = formatStrategyContext(brainMetadata, 'THE STRATEGY (this decides the outline)');
        const shape = outlineShape(brainMetadata);

        const referencesContext = this.formatReferences(references);
        const userContextString = userContext ? `\n\nCreator's extra instructions:\n${userContext}` : '';
        const sourceContext = brainMetadata?.sourceContext
            ? `\n\nOriginal Source Material:\n${brainMetadata.sourceContext.substring(0, 3000)}...`
            : '';

        TraceLogger.log('outline', 'Outline shape', { format: brainMetadata?.format, stance: brainMetadata?.stance, outcome: brainMetadata?.outcome, length: brainMetadata?.length });

        const completion = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You plan the structure of one post for a creator. The strategy decides the structure: two posts on the same topic with different strategies must get visibly different outlines (different skeleton, opening, order and number of sections), not the same outline reworded.

${shape}

How to build it:
1. First write the post's spine: one sentence saying what this post argues, shows or teaches, for this audience, in this stance.
2. Then lay out the sections in the shape above. Every section serves the spine; drop research that doesn't.
3. Each section is one string: a specific heading, a colon, then what the section does and the specific findings it uses, named briefly so the creator can recognise them (e.g. "Why the 9-to-9 day breaks new dads: uses the Naukri survey's 62% and the Infosys paternity-leave policy"). Never refer to findings by number.
4. Every "Must include" item from the strategy gets a section or a named place in one.
5. Where the creator's brief differs from the hook or angle, follow the brief.

Avoid:
- A generic essay arc (introduction, background, analysis, conclusion) unless the shape calls for it
- Sections that restate a source instead of using it
- Two sections making the same point

Return JSON: { "spine": "...", "sections": ["...", "..."] }`
                },
                {
                    role: 'user',
                    content: `Topic: ${hook}\nAngle: ${angle || 'General'}${ideaChain}${strategy}${userContextString}\n\n${this.formatDeepDive(deep_dive)}${referencesContext}${sourceContext}`
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

        const extractText = (s: unknown) => {
            if (typeof s === 'string') return s;
            if (typeof s === 'object' && s !== null) {
                const obj = s as Record<string, unknown>;
                return String(obj.title || obj.heading || obj.section || obj.text || obj.name || JSON.stringify(s));
            }
            return String(s);
        };

        if (result.sections && Array.isArray(result.sections)) {
            return result.sections.map(extractText);
        } else if (Array.isArray(result)) {
            return result.map(extractText);
        } else {
            return Object.values(result).filter(v => typeof v === 'string') as string[];
        }
    }

    // --- 4. Draft ---
    async generateDraft({ userId, hook, angle, outline, deep_dive, references, userContext, brainMetadata }: DraftParams): Promise<string> {
        const format = normalizeFormat(brainMetadata?.format);
        const ideaChain = formatIdeaChain({ hook, angle, meta: brainMetadata });
        const strategy = formatStrategyContext(brainMetadata, 'THE STRATEGY');
        const research = deep_dive ? `\n\n${this.formatDeepDive(deep_dive)}` : '';

        // Voice Injection
        let voiceContext = '';
        try {
            const profile = await voiceService.getProfile(userId);
            if (profile && profile.is_active) {
                const rulesList = profile.rules?.map(r => `- ${r}`).join('\n') || '';
                const antiList = profile.anti_patterns?.map(r => `- AVOID: ${r}`).join('\n') || '';
                voiceContext = `\n\nUSER WRITING STYLE GUIDELINES:\n- **Tone:** ${profile.voice_tone}\n- **Style Rules:**\n${rulesList}\n- **Anti-Patterns (Do Not Use):**\n${antiList}\n`;
            }
        } catch (e) {
            console.warn("Failed to load voice profile:", e);
        }

        // Expand Outline into Brief
        const outlineContext = outline?.map((s: OutlineItem, i: number) => {
            const text = typeof s === 'string' ? s : s.text;
            const notes = typeof s !== 'string' && s.notes && s.notes.length ? `[User Notes: ${s.notes.join('; ')}]` : '';
            return `Section ${i + 1}: ${text} ${notes}`;
        }).join('\n');

        // The brief attaches the research to each section, so the draft's specifics come from the findings, not the model's memory
        const briefCompletion = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are an editorial architect preparing a writer to draft one post.
Expand each outline section into a short brief for the writer:
1. The point this section makes, in one sentence, in the post's stance.
2. The specific research it uses: copy the findings it needs word for word, numbers and "(source: ...)" included. Prefer findings the outline names; add others only if they fit the section.
3. For a section with no fitting finding (e.g. one the creator added by hand), say what the creator should supply ("add your own example of ..."). Never invent a statistic, study, company or quote.

Keep the outline's order and shape. Do not add sections. This is for the writer, not the reader.`
                },
                {
                    role: 'user',
                    content: `Topic: ${hook}
Angle: ${angle || 'General'}${ideaChain}${strategy}

Outline:
${outlineContext}${research}

Expand this into a drafting brief.`
                }
            ]
        });
        const draftingBrief = briefCompletion.choices[0].message.content || outlineContext;

        // Determine Style Instruction
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
        } else if (format) {
            styleInstruction = `Format: ${format}
- Follow the structure this format implies, as the creator described it`;
        } else {
            styleInstruction = `Format: whatever the outline's shape is (argument, guide, story or list); write it as that`;
        }

        const closingInstruction = brainMetadata?.cta
            ? `End by steering the reader toward this call to action, in the creator's voice and without engagement bait: ${brainMetadata.cta}`
            : 'End the way this format and goal call for (a story on its lesson, a guide on the next step, an argument on its implication). No engagement bait.';
        const lengthInstruction = brainMetadata?.length
            ? `Length: ${brainMetadata.length}. This overrides everything else about length; cut sections short rather than run long.`
            : 'Length: as long as the outline needs and no longer; a LinkedIn post, not an essay.';

        const referencesContext = this.formatReferences(references);
        const userContextString = userContext ? `\n\nUser's Special Instructions:\n${userContext}` : '';
        const sourceContext = brainMetadata?.sourceContext
            ? `\n\nOriginal Source Material (for reference/citations):\n${brainMetadata.sourceContext.substring(0, 2000)}...`
            : '';

        TraceLogger.log('draft', 'Draft Generation Context', {
            hook,
            angle: angle || 'None',
            format: format || 'none',
            hasUserContext: !!userContext,
            hasReferences: !!references?.length,
            hasSourceContext: !!brainMetadata?.sourceContext,
            hasResearch: !!deep_dive?.research?.length,
            outlineSections: outline?.length || 0,
        });

        const completion = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `${SAFETY_PREAMBLE}

You are writing one LinkedIn post for a creator, from their drafting brief.

THE STRATEGY DECIDES THE POST. Read it first; it outranks every default below.${ideaChain}${strategy}

${styleInstruction}
${lengthInstruction}

Write for the defined audience (${brainMetadata?.audience?.role || 'the reader the brief describes'})${brainMetadata?.audience?.pain ? ` and their pain (${brainMetadata.audience.pain})` : ''}. Hold the stance${brainMetadata?.stance ? ` ("${brainMetadata.stance}")` : ''} from the first line to the last; a contrarian post does not hedge, an exploratory one does not pretend to certainty. If the post could apply to anyone, it has failed.

Writing requirements:
- Follow the Drafting Brief's sections in order and in its shape. A story reads as a story, a guide as steps, a list as items; do not turn them into an essay.
- Use the research the brief attaches to each section: its numbers, names and examples. Name where a figure comes from in plain words ("a 2024 Naukri survey found..."). Never add a statistic, study or quote that isn't in the brief or the sources.
- Where the brief says the creator should add their own example, leave a short [bracketed placeholder] instead of inventing one.
- Every paragraph earns its place; no filler, no restating.

Style & voice:
- **ADOPT THE USER'S VOICE:** ${voiceContext ? 'Strictly follow the guidelines below.' : 'Write in a natural, human voice.'}
${voiceContext}
- Short paragraphs for LinkedIn readability.
- Avoid clichés, generic advice, and motivational fluff.
- ${closingInstruction}

Constraints:
- Keep formatting native to LinkedIn: no markdown headers (#), no emojis, no formal section labels. Bold sparingly.
- Do NOT reference the outline, research process, or AI assistance.`
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

        return completion.choices[0].message.content || '';
    }

    // --- 5. Verify Strategy ---
    async verifyStrategy({ draft, brainMetadata, previous }: { draft: string, brainMetadata: BrainMetadata, previous?: PreviousStrategyCheck }): Promise<StrategyVerificationResult> {
        const strategyContext = formatStrategyContext(brainMetadata, 'Strategic Goals').trim()
            || 'No explicit strategy was given. Infer the most likely intent from the draft and judge against that.';
        const rubric = STRATEGY_CRITERIA.map(c => `- "${c.key}": ${c.ask}`).join('\n');
        const prevRatings = previous?.criteria?.filter(c => STRATEGY_CRITERIA.some(k => k.key === c.key));
        const previousBlock = prevRatings?.length
            ? `\n\nPREVIOUS CHECK (of the version before this edit):\n${prevRatings.map(c => `- ${c.key}: ${Math.max(0, Math.min(5, Math.round(Number(c.rating)) || 0))}/5${c.note ? ` (${String(c.note).slice(0, 200)})` : ''}`).join('\n')}${previous?.fix ? `\nEdit that was applied: "${String(previous.fix).slice(0, 500)}"` : ''}
Re-rating rules: a criterion keeps its previous rating unless the edit changed the part of the draft it judges. Raise it if the edit fixed the gap, lower it only if the edit made that part worse. Do not invent new problems in parts the edit did not touch.`
            : '';

        const completion = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0,
            seed: 7,
            messages: [
                {
                    role: 'system',
                    content: `You are a strict but consistent Editorial Strategy Coach.
You rate how well a draft achieves the creator's strategic intent, using a fixed rubric so the same draft always gets the same ratings.

Rate each criterion 0-5:
${rubric}

Rating scale (use these anchors exactly):
5 = fully achieved, nothing worth changing
4 = achieved, only a minor polish left
3 = partly achieved, one clear gap
2 = weak, the gap is obvious to a reader
1 = barely present
0 = missing or contradicted
If the strategy says nothing about a criterion, rate it against the draft's own evident intent.

Output JSON:
{
  "criteria": { "<key>": { "rating": 0-5, "note": "one short line on why" } },
  "critique": "Two direct sentences on the main strategic gap, or on why the draft works if nothing is below 4.",
  "strengths": ["max 2 things it does well"],
  "weaknesses": ["max 2 gaps, only from criteria rated below 4"],
  "actionable_fix": "One specific instruction that fixes the lowest-rated criterion. Empty string if every criterion is 4 or 5."
}`
                },
                {
                    role: 'user',
                    content: `STRATEGY:\n${strategyContext}${previousBlock}\n\nDRAFT CONTENT:\n${draft}`
                }
            ],
            response_format: { type: 'json_object' },
        });

        const raw = JSON.parse(completion.choices[0].message.content || '{}');
        const criteria = scoreCriteria(raw.criteria);
        const weakest = weakestCriterion(criteria);
        const list = (v: unknown) => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()) : [];
        return {
            score: totalScore(criteria),
            critique: String(raw.critique || '').trim(),
            strengths: list(raw.strengths).slice(0, 2),
            weaknesses: list(raw.weaknesses).slice(0, 2),
            // Nothing left below "done" means no fix to offer, which ends the fix loop
            actionable_fix: weakest ? String(raw.actionable_fix || weakest.note || '').trim() : '',
            criteria,
        };
    }

    // --- 6. Auto Fix Strategy ---
    async autoFixStrategy({ draft, fix_instruction, brainMetadata }: { draft: string, fix_instruction: string, brainMetadata: BrainMetadata }): Promise<string> {
        const completion = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0.3,
            messages: [
                {
                    role: 'system',
                    content: `You are a Surgical Editor specializing in "Do No Harm" revisions.
   
   OBJECTIVE:
   The user's draft has a specific flaw: "${fix_instruction}"
   Your job is to fix THIS FLAW ONLY while leaving the rest of the text EXACTLY as is.
   
   STRATEGIC CONTEXT:
   - Audience: ${brainMetadata?.audience?.role || 'Professionals'}
   - Goal: ${brainMetadata?.outcome || 'Engagement'}${formatStrategyContext(brainMetadata, 'Full strategy').replace(/\n/g, '\n   ')}
   
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

        return completion.choices[0].message.content || draft;
    }

    // --- 7. Verify Facts ---
    async verifyFacts(text: string): Promise<FactCheckResult> {
        const completion = await this.openai.chat.completions.create({
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
                    content: `TEXT TO CHECK:\n${text}`
                }
            ],
            response_format: { type: 'json_object' },
        });

        return JSON.parse(completion.choices[0].message.content || '{}');
    }

    // --- 8. Parse Strategy Brief ---
    // Turns the user's own description of the post into strategy fields. With an empty brief it
    // infers everything from the topic, draft and voice profile (this is what Auto-Strategy runs).
    async parseBrief(userId: string, { brief, hook, draftText, current }: { brief?: string; hook?: string; draftText?: string; current?: Partial<BrainMetadata> }): Promise<ParsedStrategy> {
        const profile = await voiceService.getProfile(userId);
        const voiceContext = profile && profile.is_active
            ? `USER VOICE TONE: ${profile.voice_tone}\nRULES: ${profile.rules?.join(', ')}`
            : 'No voice profile found.';

        const currentStrategy = formatStrategyContext({ ...current, brief: undefined }, 'CURRENT STRATEGY (the user may have set these by hand; keep them unless the brief says otherwise)');

        const completion = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are a Strategic Editorial Advisor.
The creator describes, in their own words, what a post should do. Turn that into a content strategy.

RULES:
- The creator's words win. Keep their phrasing and nuance; do not flatten it into generic labels.
- If the brief is empty or silent on a field, infer a sensible value from the topic, draft and voice.
- Leave out "cta", "include", "avoid", "toneNotes" and "length" unless the brief (or draft) actually implies them.
- "outcome": use one of authority | engagement | conversion | connection if it fits, otherwise a short phrase.
- "format": use one of thought_leadership | tactical_guide | personal_story | listicle if it fits, otherwise a short phrase.
- "audience.role": keep any country, region or culture the brief names (e.g. "New dads in India", not "New dads").
- "stance": a short phrase in the creator's terms (e.g. "contrarian", "gently sceptical", "excited but practical").
- "clarifyingQuestion": ask ONE short question only if something that would materially change the post is ambiguous. Otherwise null.

${voiceContext}${currentStrategy}

Output JSON:
{
  "audience": { "role": "Specific role", "pain": "Their specific challenge", "beliefs": "What they already believe about this, if known" },
  "outcome": "string",
  "stance": "string",
  "format": "string",
  "cta": "What the reader should do next",
  "include": ["Specific facts, names or points that must appear"],
  "avoid": ["Words, topics or habits to stay away from"],
  "toneNotes": "Tone in the creator's words",
  "length": "Length or platform preference",
  "clarifyingQuestion": "string or null"
}`
                },
                {
                    role: 'user',
                    content: `Topic: ${hook || 'Not given'}

Creator's brief:
${brief?.trim() || '(empty: infer the strategy)'}${draftText?.trim() ? `\n\nDraft so far:\n${draftText.slice(0, 3000)}` : ''}`
                }
            ],
            response_format: { type: 'json_object' }
        });

        return sanitizeParsedStrategy(JSON.parse(completion.choices[0].message.content || '{}'));
    }

    // --- 9. Generate Image ---
    // DALL-E 3 was shut down in May 2026; gpt-image models only return base64,
    // so the caller stores the bytes and links to the stored copy.
    async generateImage(prompt: string, size: ImageSize = '1024x1024'): Promise<Buffer | null> {
        try {
            const response = await this.openai.images.generate({
                model: "gpt-image-1-mini",
                prompt: prompt,
                n: 1,
                size,
                quality: "medium",
                output_format: "jpeg",
                output_compression: 85,
            });

            const b64 = response.data?.[0]?.b64_json;
            return b64 ? Buffer.from(b64, 'base64') : null;
        } catch (error) {
            console.error("Image Generation Failed:", error);
            return null;
        }
    }
}

export const brainGenerationService = new BrainGenerationService();
type ImageSize = '1024x1024' | '1536x1024';
export const generateImage = (prompt: string, size?: ImageSize) => brainGenerationService.generateImage(prompt, size);
