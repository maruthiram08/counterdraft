import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/user-sync';
import { moderateContent, getModerationErrorMessage } from '@/lib/moderation';
import { UsageService } from '@/lib/billing/usage';
import { brainGenerationService } from '@/lib/brain/generation';
import { rateLimit } from '@/lib/rate-limit';
import { cleanAnswers } from '@/lib/editor/draft-tools';
import { findPlaceholders } from '@/lib/editor/placeholders';
import { cleanCraftFix } from '@/lib/editor/craft-score';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const start = Date.now();
    let actionType = 'unknown';
    let userIdStr = 'anon';
    let status = 'success';
    let errorDetails: string | undefined;

    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            status = 'error';
            errorDetails = 'Unauthorized';
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        userIdStr = userId;

        const body = await req.json();
        const { action, hook, angle, deep_dive, outline, references, userContext, currentText, type, brainMetadata, draft, fix_instruction, brief, draftText } = body;
        actionType = action || 'unknown';

        // 🛡️ CONTENT MODERATION CHECK (on user-provided text fields)
        const inputToModerate = [hook, angle, userContext, currentText, brief, typeof body.instruction === 'string' ? body.instruction : '', ...cleanAnswers(body.answers).map(a => a.answer), ...cleanAnswers(body.notes).map(a => a.answer)].filter(Boolean).join(' ');
        if (inputToModerate) {
            const modResult = await moderateContent(inputToModerate);
            if (modResult.flagged) {
                status = 'flagged';
                return NextResponse.json({
                    error: getModerationErrorMessage(modResult),
                    flagged: true,
                    categories: modResult.categories
                }, { status: 400 });
            }
        }

        if (action === 'deep_dive') {
            // Check Limit
            const limit = await UsageService.checkSearchLimit(userId);
            if (!limit.allowed) {
                status = 'limited';
                return NextResponse.json({
                    error: 'Search Limit Reached',
                    message: limit.reason,
                    usage: limit,
                    upgradeUrl: '/pricing'
                }, { status: 403 });
            }

            const result = await brainGenerationService.generateDeepDive({
                userId,
                hook,
                angle,
                references,
                userContext,
                brainMetadata
            });

            // Increment Usage
            await UsageService.incrementSearchCount(userId);

            // Add AI disclaimer to response
            return NextResponse.json({
                deep_dive: result,
                disclaimer: "AI-generated content. Please verify facts and statistics before publishing."
            });

        } else if (action === 'refine_point') {
            const refined = await brainGenerationService.refineResearchPoint(currentText, userContext, type);
            return NextResponse.json({ refined });

        } else if (action === 'outline') {
            // Check Limit (AI Outliner)
            const limitCheck = await UsageService.checkDraftLimit(userId);
            if (!limitCheck.allowed) {
                status = 'limited';
                return NextResponse.json({
                    error: 'Limit Reached',
                    message: limitCheck.reason,
                    tier: limitCheck.tier,
                    upgradeUrl: '/pricing'
                }, { status: 403 });
            }

            const sections = await brainGenerationService.generateOutline({
                userId,
                hook,
                angle,
                deep_dive,
                references,
                userContext,
                brainMetadata
            });

            return NextResponse.json({ outline: { sections } });

        } else if (action === 'draft') {
            // Check Limit (AI Writer)
            const limitCheck = await UsageService.checkDraftLimit(userId);
            if (!limitCheck.allowed) {
                status = 'limited';
                return NextResponse.json({
                    error: 'Limit Reached',
                    message: limitCheck.reason,
                    tier: limitCheck.tier,
                    upgradeUrl: '/pricing'
                }, { status: 403 });
            }

            const { draft: generatedDraft, suggestions } = await brainGenerationService.generateDraft({
                userId,
                hook,
                angle,
                outline,
                deep_dive,
                references,
                userContext,
                brainMetadata,
                answers: cleanAnswers(body.answers),
            });

            return NextResponse.json({ draft: generatedDraft, suggestions });

        } else if (action === 'verify_strategy') {
            const textToVerify = draft || currentText;

            if (!textToVerify || !brainMetadata) {
                status = 'error';
                errorDetails = 'Missing draft content or strategy metadata';
                return NextResponse.json({ error: 'Missing draft content or strategy metadata' }, { status: 400 });
            }

            const result = await brainGenerationService.verifyStrategy({
                draft: textToVerify,
                brainMetadata,
                previous: body.previous
            });

            return NextResponse.json(result);

        } else if (action === 'auto_fix_strategy') {
            if (!draft || !fix_instruction) {
                status = 'error';
                errorDetails = 'Missing draft or fix instruction';
                return NextResponse.json({ error: 'Missing draft or fix instruction' }, { status: 400 });
            }

            const refinedDraft = await brainGenerationService.autoFixStrategy({
                draft,
                fix_instruction,
                brainMetadata
            });

            return NextResponse.json({ draft: refinedDraft });

        } else if (action === 'verify_facts') {
            const textToVerify = draft || currentText;
            if (!textToVerify) {
                status = 'error';
                errorDetails = 'Missing text';
                return NextResponse.json({ error: 'Missing text' }, { status: 400 });
            }

            const result = await brainGenerationService.verifyFacts(textToVerify);
            return NextResponse.json(result);

        } else if (action === 'outline_shapes' || action === 'draft_questions' || action === 'rewrite_section' || action === 'variants' || action === 'craft_score' || action === 'craft_fix' || action === 'use_notes') {
            // Small edits on work already made: rate limited, not counted as new drafts
            const limit = rateLimit(`develop-edit:${userId}`, { windowMs: 15 * 60 * 1000, max: 30 });
            if (!limit.allowed) {
                status = 'rate_limited';
                return NextResponse.json({ error: 'Too many requests. Try again in a few minutes.' }, { status: 429 });
            }

            if (action === 'outline_shapes') {
                const current = Array.isArray(outline) ? outline.map((s: unknown) => typeof s === 'string' ? s : String((s as { text?: unknown })?.text ?? '')).filter(Boolean) : [];
                const shapes = await brainGenerationService.outlineShapes({ hook, angle, deep_dive, brainMetadata, current });
                return NextResponse.json({ shapes });
            }

            if (action === 'draft_questions') {
                const questions = await brainGenerationService.draftQuestions({ hook, angle, outline, brainMetadata });
                return NextResponse.json({ questions });
            }

            if (typeof draft !== 'string' || !draft.trim()) {
                status = 'error';
                errorDetails = 'Missing draft';
                return NextResponse.json({ error: 'Missing draft' }, { status: 400 });
            }

            if (action === 'use_notes') {
                const notes = cleanAnswers(body.notes);
                if (!notes.length && !findPlaceholders(draft).length) {
                    status = 'error';
                    errorDetails = 'Nothing to work in';
                    return NextResponse.json({ error: 'Add a note first' }, { status: 400 });
                }
                const result = await brainGenerationService.useNotes({ userId, draft, notes, outline, deep_dive, brainMetadata });
                return NextResponse.json(result);
            }

            if (action === 'craft_score') {
                const score = await brainGenerationService.craftScore({ draft, previous: Array.isArray(body.previous) ? body.previous.slice(0, 4) : undefined });
                return NextResponse.json(score);
            }

            if (action === 'craft_fix') {
                const fix = cleanCraftFix(body.fix);
                if (!fix) {
                    status = 'error';
                    errorDetails = 'Missing fix';
                    return NextResponse.json({ error: 'Missing fix' }, { status: 400 });
                }
                const fixed = await brainGenerationService.craftFix({ userId, draft, key: fix.key, fix: fix.fix, brainMetadata });
                return NextResponse.json({ draft: fixed });
            }

            if (action === 'rewrite_section') {
                const section = typeof body.section === 'string' ? body.section.trim() : '';
                if (!section) {
                    status = 'error';
                    errorDetails = 'Missing section';
                    return NextResponse.json({ error: 'Missing section' }, { status: 400 });
                }
                const rewritten = await brainGenerationService.rewriteSection({
                    userId,
                    draft,
                    section,
                    instruction: typeof body.instruction === 'string' ? body.instruction.trim().slice(0, 500) : undefined,
                    outline,
                    deep_dive,
                    brainMetadata,
                });
                return NextResponse.json({ section: rewritten });
            }

            const variants = await brainGenerationService.draftVariants({ userId, draft, brainMetadata });
            return NextResponse.json({ variants });

        } else if (action === 'parse_brief' || action === 'autofill_strategy') {
            const result = await brainGenerationService.parseBrief(userId, { brief, hook, draftText, current: brainMetadata });
            return NextResponse.json(result);

        } else {
            status = 'error';
            errorDetails = 'Invalid action';
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

    } catch (err: unknown) {
        console.error('Development API Error:', err);
        status = 'error';
        errorDetails = err instanceof Error ? err.message : 'Internal Server Error';
        return NextResponse.json({ error: errorDetails }, { status: 500 });
    } finally {
        UsageService.logPerformance('api_content_develop', {
            action: actionType,
            userId: userIdStr,
            duration: Date.now() - start,
            status,
            error: errorDetails
        });
    }
}
