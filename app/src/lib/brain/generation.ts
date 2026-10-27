import { openai } from '@/lib/openai';
import { TraceLogger } from '@/lib/trace';
import { SAFETY_PREAMBLE } from '@/lib/openai';
import { voiceService } from '@/lib/voice/service';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { formatNotes, parseDraftQuestions, parseOutlineShapes, parseVariants, DraftAnswer, DraftQuestion, DraftVariant, OutlineShapeOption } from '@/lib/editor/draft-tools';
import { extractSuggestions } from '@/lib/editor/suggestions';
import { acceptSelfEdit, formatStyleExamples, pickStyleExamples, selfEditChecklist, PastPost, SEE_MORE_CHARS } from './craft';
import { CRAFT_CRITERIA, CraftKey, CraftScore, scoreCraft } from '@/lib/editor/craft-score';
import { BrainMetadata, ContentReference, DeepDiveData, OutlineItem, ResearchItem, InsightItem } from '@/types';
import { formatCaptureSources } from './captures';
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

export interface DraftResult {
    draft: string;
    suggestions: string[]; // passages the draft wrote where it needed a detail nobody gave, for the creator to check
}

export interface DraftParams {
    answers?: DraftAnswer[]; // the creator's own answers to the questions asked before drafting, and notes added since
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

// Research and outlines run on the fast model; the words a reader sees are written by the stronger one
const WRITER_MODEL = 'gpt-4o';

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
        const captures = formatCaptureSources(brainMetadata);
        // Plan from the original search and saved angle first; the hook is only a working title
        const origin = originQuery(brainMetadata);
        const searchSeed = `${origin ? `\nOriginal search: ${origin}` : ''}\nSaved angle: ${originAngle(angle, brainMetadata) || 'None'}`;
        const plan = await this.planResearchQueries(hook, `${searchSeed}${ideaChain}${brainContext}${exploreSources}${formatCaptureSources(brainMetadata, 1200)}`)
            .catch((): ResearchPlan => ({ queries: fallbackQueries(hook, brainMetadata, angle) }));
        // Each "must include" item gets its own search so the brief's extra asks aren't crowded out by the hook
        const includeQueries = (brainMetadata?.include || []).slice(0, 2).map(item => plan.place && !item.toLowerCase().includes(plan.place.toLowerCase().slice(0, 4)) ? `${item} ${plan.place}` : item);
        const askQueries = (plan.asks || []).map(a => a.query);
        const queries = [...new Set([...anchorQueries([...plan.queries, ...askQueries], brainMetadata, plan.place), ...includeQueries])];
        const asks = (plan.asks || []).map(a => a.question);
        const asksBlock = asks.length ? `\n\nTHE BRIEF'S QUESTIONS (each needs at least two findings of its own, or a "Gap:" finding):\n${asks.map(a => `- ${a}`).join('\n')}` : '';
        const sources = await gatherWebSources(queries, 15, plan.country);
        const webSources = `${exploreSources}${captures}${formatWebSources(sources)}`;

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
   - Base findings on the EXPLORE SOURCES, THE CREATOR'S CAPTURES, WEB SOURCES, references and source material provided. End each sourced finding with the domain shown in brackets after that source's title, e.g. "(source: hbr.org)"; never a paraphrased title or site name.
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
        const captures = formatCaptureSources(brainMetadata, 1500);
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
                    content: `Topic: ${hook}\nAngle: ${angle || 'General'}${ideaChain}${strategy}${userContextString}\n\n${this.formatDeepDive(deep_dive)}${captures}${referencesContext}${sourceContext}`
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
    async generateDraft({ userId, hook, angle, outline, deep_dive, references, userContext, brainMetadata, answers }: DraftParams): Promise<DraftResult> {
        const format = normalizeFormat(brainMetadata?.format);
        const ideaChain = formatIdeaChain({ hook, angle, meta: brainMetadata });
        const strategy = formatStrategyContext(brainMetadata, 'THE STRATEGY');
        const research = deep_dive ? `\n\n${this.formatDeepDive(deep_dive)}` : '';
        const captures = formatCaptureSources(brainMetadata);

        const voiceContext = await this.voiceContext(userId);

        // The writer's own posts, so the draft sounds like them and not like generic LinkedIn
        const styleExamples = formatStyleExamples(pickStyleExamples(
            await this.loadPastPosts(userId),
            [hook, angle, brainMetadata?.brief].filter(Boolean).join(' '),
        ));

        // What the creator told us: their own stories and examples, which beat anything we could suggest
        const ownMaterial = answers?.length
            ? `\n\nTHE CREATOR'S OWN MATERIAL (their answers and notes; every one goes into the post as a real detail, in their words where possible):\n${formatNotes(answers)}`
            : '';

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
3. The creator's own material: attach each answer or note to the section it fits best. Every one must land somewhere; they answered so the post would use it.
4. For a section that still needs an example, moment or detail nobody gave, write "SUGGEST:" and the kind of example that would fit (e.g. "SUGGEST: a well-known national team win that changed how the country was seen abroad"). The writer will propose one for the creator to check. Never invent a statistic, study or quote.

Keep the outline's order and shape. Do not add sections. This is for the writer, not the reader.`
                },
                {
                    role: 'user',
                    content: `Topic: ${hook}
Angle: ${angle || 'General'}${ideaChain}${strategy}

Outline:
${outlineContext}${research}${formatCaptureSources(brainMetadata, 1500)}${ownMaterial}

Expand this into a drafting brief. Put the creator's own material in the sections it fits before you mark anything SUGGEST.`
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
            model: WRITER_MODEL,
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
- Use every piece of the creator's own material below, in the section it fits; it outranks research for stories and examples. A draft that drops an answer they gave has failed.
- Never leave a gap or a [bracketed placeholder]. Where the brief says SUGGEST, write the example yourself so the post reads complete, and wrap exactly that passage in <suggested>...</suggested> so the creator can check it or swap in their own:
  - A public example (an event, a team, a company): only one you are sure is real and well known, described without numbers or quotes you don't have.
  - Something only the creator lived (a moment, a client, a lesson): a short, believable version in first person, plain and specific, that they can edit.
  - Keep each suggestion to one to three sentences. Never wrap the creator's own material or the research.
- Every paragraph earns its place; no filler, no restating.

Style & voice:
- **ADOPT THE USER'S VOICE:** ${voiceContext ? 'Strictly follow the guidelines below.' : 'Write in a natural, human voice.'}${styleExamples ? ' Their past posts below show how they really write; when a guideline and the posts disagree, follow the posts.' : ''}
${voiceContext}${styleExamples}
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
${draftingBrief}${ownMaterial}

${captures}${referencesContext}${sourceContext}${userContextString}`
                }
            ],
        });

        const draft = completion.choices[0].message.content || '';
        if (!draft) return { draft: '', suggestions: [] };
        const edited = await this.selfEdit(draft, { stance: brainMetadata?.stance, voiceContext, styleExamples });
        const { text, suggestions } = extractSuggestions(edited);
        return { draft: text, suggestions };
    }

    // --- 4a. Work the creator's notes into a draft they may have edited: answers they remembered later, and fill any gaps ---
    async useNotes({ userId, draft, notes, outline, deep_dive, brainMetadata }: {
        userId: string;
        draft: string; // with suggested passages still wrapped in <suggested> tags
        notes: DraftAnswer[];
        outline?: OutlineItem[];
        deep_dive?: DeepDiveData;
        brainMetadata?: BrainMetadata;
    }): Promise<DraftResult> {
        const voiceContext = await this.voiceContext(userId);
        const outlineText = outline?.map((s, i) => `${i + 1}. ${typeof s === 'string' ? s : s.text}`).join('\n') || '';
        const completion = await this.openai.chat.completions.create({
            model: WRITER_MODEL,
            temperature: 0.4,
            messages: [
                {
                    role: 'system',
                    content: `${SAFETY_PREAMBLE}

You revise a creator's LinkedIn post to use the notes they gave you. They may have edited the post by hand; keep their wording wherever a note doesn't touch it.

1. Work every note into the post where it fits: replace a <suggested> passage or a [bracketed placeholder] it covers, or add it to the paragraph it belongs to. Use their words where you can. Every note must show up in the post.
2. Fill every [bracketed placeholder] no note covers with your own suggestion wrapped in <suggested>...</suggested>: a public example only if you are sure it is real and well known, otherwise a short, believable first-person version they can edit. Never invent a statistic, study or quote.
3. Keep every other <suggested> passage exactly as it is, tags included. Drop the tags only where a note replaced the passage.
4. Keep the structure, stance, facts and length (a note may add a sentence or two). Match the creator's voice.${voiceContext}${formatStrategyContext(brainMetadata, 'THE STRATEGY')}

Return only the post, with no comments or markdown fences.`
                },
                {
                    role: 'user',
                    content: `${outlineText ? `Outline:\n${outlineText}\n\n` : ''}${deep_dive ? `${this.formatDeepDive(deep_dive)}\n\n` : ''}THE CREATOR'S NOTES:\n${formatNotes(notes)}\n\nPost:\n${draft}`
                }
            ],
        });
        const { text, suggestions } = extractSuggestions((completion.choices[0].message.content || '').trim() || draft);
        return { draft: text, suggestions };
    }

    // The creator's voice profile as prompt guidelines; empty when they have none
    private async voiceContext(userId: string): Promise<string> {
        try {
            const profile = await voiceService.getProfile(userId);
            if (profile && profile.is_active) {
                const rulesList = profile.rules?.map(r => `- ${r}`).join('\n') || '';
                const antiList = profile.anti_patterns?.map(r => `- AVOID: ${r}`).join('\n') || '';
                return `\n\nUSER WRITING STYLE GUIDELINES:\n- **Tone:** ${profile.voice_tone}\n- **Style Rules:**\n${rulesList}\n- **Anti-Patterns (Do Not Use):**\n${antiList}\n`;
            }
        } catch (e) {
            console.warn("Failed to load voice profile:", e);
        }
        return '';
    }

    // --- 3b. Other outline shapes: the same research and strategy, a different skeleton ---
    async outlineShapes({ hook, angle, deep_dive, brainMetadata, current }: Omit<OutlineParams, 'userId' | 'references' | 'userContext'> & { current: string[] }): Promise<OutlineShapeOption[]> {
        const completion = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0.7,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `A creator has an outline for one post and wants to see it built a different way before drafting. Propose 2 alternative outlines with clearly different skeletons from the current one and from each other, for example: a story told from one moment, a contrarian argument, a step-by-step guide, a list of lessons, a before-and-after, a myth-versus-reality.

Each alternative:
- Keeps the post's topic, audience and goal, and uses the same research.
- Has 3-7 sections. Each section is one string: a specific heading, a colon, then what it does and the findings it uses, named briefly.
- Gets a short name for its shape and one line on when it works better than the current outline.

Return JSON: { "shapes": [ { "name": "...", "why": "...", "sections": ["...", "..."] } ] }`
                },
                {
                    role: 'user',
                    content: `Topic: ${hook}\nAngle: ${angle || 'General'}${formatStrategyContext(brainMetadata, 'THE STRATEGY')}\n\nCurrent outline:\n${current.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n${this.formatDeepDive(deep_dive)}`
                }
            ],
        });
        let raw: unknown = {};
        try {
            raw = JSON.parse(completion.choices[0].message.content || '{}');
        } catch {
            raw = {};
        }
        return parseOutlineShapes(raw, current);
    }

    // --- 3c. Questions before drafting: the stories and examples only the creator has ---
    async draftQuestions({ hook, angle, outline, brainMetadata }: { hook: string; angle?: string; outline?: OutlineItem[]; brainMetadata?: BrainMetadata }): Promise<DraftQuestion[]> {
        const outlineText = outline?.map((s, i) => `${i + 1}. ${typeof s === 'string' ? s : s.text}`).join('\n') || '';
        const completion = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0.4,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `Before an AI drafts a creator's post, ask them 2 or 3 short questions whose answers only they can give, so the draft carries real detail instead of [placeholders]: a moment they lived, an example from their work, a number they know, what they actually think.

Rules:
- Each question points at a specific section of the outline that needs it. Ask about the most important gaps first.
- Never ask for things research can answer, or for their opinion on the topic in general.
- Plain words, under 20 words each, answerable in a sentence or two.
- Each gets a hint on what helps (e.g. "one moment, with where you were").

Return JSON: { "questions": [ { "question": "...", "hint": "..." } ] }`
                },
                { role: 'user', content: `Topic: ${hook}\nAngle: ${angle || 'General'}${formatStrategyContext(brainMetadata, 'THE STRATEGY')}\n\nOutline:\n${outlineText}` }
            ],
        });
        let raw: unknown = {};
        try {
            raw = JSON.parse(completion.choices[0].message.content || '{}');
        } catch {
            raw = {};
        }
        return parseDraftQuestions(raw);
    }

    // --- 4c. Rewrite one paragraph of the draft, with the outline and research behind it ---
    async rewriteSection({ userId, draft, section, instruction, outline, deep_dive, brainMetadata }: {
        userId: string;
        draft: string;
        section: string;
        instruction?: string;
        outline?: OutlineItem[];
        deep_dive?: DeepDiveData;
        brainMetadata?: BrainMetadata;
    }): Promise<string> {
        const voiceContext = await this.voiceContext(userId);
        const outlineText = outline?.map((s, i) => `${i + 1}. ${typeof s === 'string' ? s : s.text}`).join('\n') || '';
        const completion = await this.openai.chat.completions.create({
            model: WRITER_MODEL,
            temperature: 0.6,
            messages: [
                {
                    role: 'system',
                    content: `${SAFETY_PREAMBLE}

You rewrite one paragraph of a creator's LinkedIn post. The rest of the post stays as it is, so the new paragraph must fit between the text before and after it.
${instruction ? `The creator asked: "${instruction}". Do that.` : 'Make it sharper, more specific and more like the creator, keeping its point.'}

Rules:
- Use the research below for specifics. Never invent a statistic, study, name or quote that isn't in it or the post.
- Keep any [bracketed placeholder] unless the creator's instruction fills it.
- Same role in the post as before; roughly the same length unless asked otherwise.
- Match the voice of the rest of the post.${voiceContext}${formatStrategyContext(brainMetadata, 'THE STRATEGY')}

Return only the new paragraph.`
                },
                {
                    role: 'user',
                    content: `${outlineText ? `Outline:\n${outlineText}\n\n` : ''}${deep_dive ? `${this.formatDeepDive(deep_dive)}\n\n` : ''}Whole post:\n${draft}\n\nParagraph to rewrite:\n${section}`
                }
            ],
        });
        return (completion.choices[0].message.content || '').trim();
    }

    // --- 4d. Variants of a finished draft to compare: shorter, punchier, more personal ---
    async draftVariants({ userId, draft, brainMetadata }: { userId: string; draft: string; brainMetadata?: BrainMetadata }): Promise<DraftVariant[]> {
        const voiceContext = await this.voiceContext(userId);
        const completion = await this.openai.chat.completions.create({
            model: WRITER_MODEL,
            temperature: 0.7,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `${SAFETY_PREAMBLE}

Rewrite a creator's LinkedIn post three ways so they can compare:
- "shorter": about half the length. Keep the opening's hook, the main point and the ending; cut everything else.
- "punchier": same content, tighter sentences, stronger verbs, more line breaks, a harder-hitting first line.
- "personal": more first person: what the creator saw, did or felt. Where that needs a detail only they know, leave a short [bracketed placeholder] instead of inventing it.

All three keep the post's argument, stance, facts and call to action, invent no facts, keep any existing [placeholders], and stay in the creator's voice. No markdown headers, no emoji.${voiceContext}${formatStrategyContext(brainMetadata, 'THE STRATEGY')}

Return JSON: { "shorter": "...", "punchier": "...", "personal": "..." }`
                },
                { role: 'user', content: draft }
            ],
        });
        let raw: unknown = {};
        try {
            raw = JSON.parse(completion.choices[0].message.content || '{}');
        } catch {
            raw = {};
        }
        return parseVariants(raw, draft);
    }

    // The writer's LinkedIn posts and the Pipeline posts they finished, newest first
    private async loadPastPosts(userId: string): Promise<PastPost[]> {
        try {
            const [posts, published] = await Promise.all([
                supabaseAdmin
                    .from('raw_posts')
                    .select('content, posted_at, created_at')
                    .eq('user_id', userId)
                    .eq('is_inspiration', false)
                    .order('created_at', { ascending: false })
                    .limit(60),
                supabaseAdmin
                    .from('content_items')
                    .select('draft_content, published_at, updated_at')
                    .eq('user_id', userId)
                    .eq('stage', 'published')
                    .order('updated_at', { ascending: false })
                    .limit(20),
            ]);
            return [
                ...(published.data || []).map(p => ({ text: p.draft_content || '', date: p.published_at || p.updated_at })),
                ...(posts.data || []).map(p => ({ text: p.content || '', date: p.posted_at || p.created_at })),
            ];
        } catch (e) {
            console.warn('Failed to load past posts for style examples:', e);
            return [];
        }
    }

    // --- 4b. Self-edit: an editor's pass over the draft before the creator sees it ---
    private async selfEdit(draft: string, { stance, voiceContext, styleExamples }: { stance?: string; voiceContext: string; styleExamples: string }): Promise<string> {
        try {
            const completion = await this.openai.chat.completions.create({
                model: WRITER_MODEL,
                temperature: 0.3,
                messages: [
                    {
                        role: 'system',
                        content: `You are the creator's editor doing one tightening pass on their LinkedIn draft before they see it. Fix only what this checklist catches; leave every line that already works exactly as it is.

Checklist:
${selfEditChecklist(draft)}

Keep:
- The structure, order, argument${stance ? ` and stance ("${stance}")` : ''}.
- Every fact, number, name and source exactly as written. Add none.
- Every [bracketed placeholder] exactly as written, and every <suggested>...</suggested> tag pair around its passage (you may tighten the words inside).
- The creator's voice.${voiceContext}${styleExamples}
- Roughly the same length; cutting is fine, padding is not.

Return only the edited post, with no comments or markdown fences.`
                    },
                    { role: 'user', content: draft }
                ],
            });
            return acceptSelfEdit(draft, completion.choices[0].message.content);
        } catch (e) {
            console.warn('Self-edit pass failed, keeping the first draft:', e);
            return draft;
        }
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

    // --- 6b. Craft score: hook and specifics rated here, readability and rhythm measured from the text ---
    async craftScore({ draft, previous }: { draft: string; previous?: { key?: unknown; rating?: unknown; note?: unknown }[] }): Promise<CraftScore> {
        const judged = CRAFT_CRITERIA.filter(c => c.key === 'hook' || c.key === 'specifics');
        const prev = (Array.isArray(previous) ? previous : []).filter(c => judged.some(k => k.key === c?.key));
        const previousBlock = prev.length
            ? `\n\nPREVIOUS CHECK (of an earlier version):\n${prev.map(c => `- ${String(c.key)}: ${Math.max(0, Math.min(5, Math.round(Number(c.rating)) || 0))}/5${c.note ? ` (${String(c.note).slice(0, 200)})` : ''}`).join('\n')}
A criterion keeps its previous rating unless the part of the post it judges has changed.`
            : '';
        const completion = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0,
            seed: 7,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `You are a LinkedIn writing editor rating the craft of a post, not its strategy. Use the fixed rubric so the same post always gets the same ratings.

Rate each 0-5:
${judged.map(c => `- "${c.key}": ${c.ask}`).join('\n')}
For "hook", judge only the first ${SEE_MORE_CHARS} characters, which is what shows before "see more".

Anchors: 5 = nothing worth changing, 4 = only a minor polish, 3 = one clear gap, 2 = weak and obvious to a reader, 1 = barely there, 0 = missing.
[Bracketed placeholders] are details the creator will fill in; count them as specific.

Return JSON:
{
  "hook": { "rating": 0-5, "note": "one short line on why", "fix": "one specific instruction that would raise it, quoting the line to change. Empty if 4 or 5." },
  "specifics": { "rating": 0-5, "note": "...", "fix": "... name the vague claims to make concrete, using detail already in the post or a [placeholder] for detail only the creator knows. Empty if 4 or 5." }
}`
                },
                { role: 'user', content: `${previousBlock}\n\nPOST:\n${draft}`.trim() }
            ],
        });
        let raw: unknown = {};
        try {
            raw = JSON.parse(completion.choices[0].message.content || '{}');
        } catch {
            raw = {};
        }
        return scoreCraft(raw, draft);
    }

    // Fixes one part of the craft score and leaves the rest of the post as it was
    async craftFix({ userId, draft, key, fix, brainMetadata }: { userId: string; draft: string; key: CraftKey; fix: string; brainMetadata?: BrainMetadata }): Promise<string> {
        const criterion = CRAFT_CRITERIA.find(c => c.key === key)!;
        const voiceContext = await this.voiceContext(userId);
        const completion = await this.openai.chat.completions.create({
            model: WRITER_MODEL,
            temperature: 0.3,
            messages: [
                {
                    role: 'system',
                    content: `You are the creator's editor improving one thing in their LinkedIn post: ${criterion.label.toLowerCase()} (${criterion.ask}).

What to do: ${fix}

Rules:
- Change only what this needs. Copy every other line word for word.
- Keep every fact, number, name and [bracketed placeholder] exactly as written. Invent no facts; where a concrete detail only the creator knows is needed, add a short [bracketed placeholder].
- Keep the argument, stance, call to action and roughly the same length.
- Stay in the creator's voice.${voiceContext}${formatStrategyContext(brainMetadata, 'THE STRATEGY')}

Return only the full post, with no comments or markdown fences.`
                },
                { role: 'user', content: draft }
            ],
        });
        return acceptSelfEdit(draft, completion.choices[0].message.content);
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
