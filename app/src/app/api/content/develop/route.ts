import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/user-sync';
import { moderateContent, getModerationErrorMessage } from '@/lib/moderation';
import { UsageService } from '@/lib/billing/usage';
import { brainGenerationService } from '@/lib/brain/generation';

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
        const { action, hook, angle, deep_dive, outline, references, userContext, currentText, type, brainMetadata, draft, fix_instruction } = body;
        actionType = action || 'unknown';

        // 🛡️ CONTENT MODERATION CHECK (on user-provided text fields)
        const inputToModerate = [hook, angle, userContext, currentText].filter(Boolean).join(' ');
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

            const generatedDraft = await brainGenerationService.generateDraft({
                userId,
                hook,
                angle,
                outline,
                references,
                userContext,
                brainMetadata
            });

            return NextResponse.json({ draft: generatedDraft });

        } else if (action === 'verify_strategy') {
            const textToVerify = draft || currentText;

            if (!textToVerify || !brainMetadata) {
                status = 'error';
                errorDetails = 'Missing draft content or strategy metadata';
                return NextResponse.json({ error: 'Missing draft content or strategy metadata' }, { status: 400 });
            }

            const result = await brainGenerationService.verifyStrategy({
                draft: textToVerify,
                brainMetadata
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

        } else if (action === 'autofill_strategy') {
            const result = await brainGenerationService.autofillStrategy(userId, hook);
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
