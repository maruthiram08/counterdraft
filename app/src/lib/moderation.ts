/**
 * Content Moderation Utility
 * Uses OpenAI's free Moderation API to pre-screen user inputs for harmful content.
 * https://platform.openai.com/docs/guides/moderation
 */

import { openai } from './openai';
import { TraceLogger } from './trace';

// Maximum input length to prevent token abuse (approx 10,000 tokens)
const MAX_INPUT_LENGTH = 40000;

// Common prompt injection patterns to detect and block
const INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/i,
    /disregard\s+(all\s+)?(previous|prior|above)/i,
    /forget\s+(all\s+)?(previous|prior|above)/i,
    /reveal\s+(your\s+)?(system\s+)?prompt/i,
    /show\s+(me\s+)?(your\s+)?(system\s+)?prompt/i,
    /what\s+(are\s+)?(your\s+)?(system\s+)?instructions/i,
    /pretend\s+you\s+are\s+(a\s+)?different\s+(ai|assistant|model)/i,
    /you\s+are\s+now\s+(a\s+)?DAN/i,
    /jailbreak/i,
    /bypass\s+(content\s+)?(filter|moderation|safety)/i,
];

// Patterns that indicate legitimate prevention/awareness/help content
// If these match, we override false positives from OpenAI moderation
const LEGITIMATE_CONTEXT_PATTERNS = [
    /prevention/i,
    /awareness/i,
    /support\s+(for|group|resources?)/i,
    /help(ing|s)?\s+(people|others|those|someone)/i,
    /crisis\s+(hotline|helpline|resources?|support)/i,
    /mental\s+health/i,
    /how\s+to\s+(help|support|prevent)/i,
    /resources?\s+for/i,
    /warning\s+signs/i,
    /education(al)?\s+(about|on|content)/i,
];

/**
 * Checks if inputcontains legitimate context patterns indicating
 * the user is writing about helping/prevention, not harming.
 */
function hasLegitimateContext(input: string): boolean {
    return LEGITIMATE_CONTEXT_PATTERNS.some(pattern => pattern.test(input));
}

export interface ModerationResult {
    flagged: boolean;
    categories: string[];
    reason?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
    'harassment': 'Harassment',
    'harassment/threatening': 'Threatening Harassment',
    'hate': 'Hate Speech',
    'hate/threatening': 'Threatening Hate Speech',
    'self-harm': 'Self-Harm',
    'self-harm/intent': 'Self-Harm Intent',
    'self-harm/instructions': 'Self-Harm Instructions',
    'sexual': 'Sexual Content',
    'sexual/minors': 'Sexual Content (Minors)',
    'violence': 'Violence',
    'violence/graphic': 'Graphic Violence',
};

/**
 * Checks if the input text contains harmful content or prompt injection attempts.
 * Returns a ModerationResult with flagged status and categories.
 */
export async function moderateContent(input: string): Promise<ModerationResult> {
    // Input length validation
    if (input.length > MAX_INPUT_LENGTH) {
        TraceLogger.log('moderation', 'Input Too Long', { length: input.length, max: MAX_INPUT_LENGTH });
        return {
            flagged: true,
            categories: ['Input Too Long'],
            reason: `Input exceeds maximum length of ${MAX_INPUT_LENGTH} characters. Please shorten your content.`,
        };
    }

    // Prompt injection detection
    for (const pattern of INJECTION_PATTERNS) {
        if (pattern.test(input)) {
            TraceLogger.log('moderation', 'Prompt Injection Detected', {
                pattern: pattern.source,
                input: input.substring(0, 100) + '...'
            });
            return {
                flagged: true,
                categories: ['Prompt Injection'],
                reason: "I can't process requests that attempt to manipulate my instructions.",
            };
        }
    }

    try {
        const response = await openai.moderations.create({
            input: input,
        });

        const result = response.results[0];

        if (result.flagged) {
            // Get all flagged categories
            const flaggedCategories = Object.entries(result.categories)
                .filter(([_, value]) => value === true)
                .map(([key]) => CATEGORY_LABELS[key] || key);

            // Check for false positive: If content is about prevention/awareness, allow it
            const selfHarmCategories = ['Self-Harm', 'Self-Harm Intent', 'Self-Harm Instructions'];
            const isSelfHarmFlagged = flaggedCategories.some(c => selfHarmCategories.includes(c));

            if (isSelfHarmFlagged && hasLegitimateContext(input)) {
                TraceLogger.log('moderation', 'False Positive Override (Prevention Context)', {
                    input: input.substring(0, 100) + '...',
                    originalCategories: flaggedCategories,
                });
                return { flagged: false, categories: [] };
            }

            TraceLogger.log('moderation', 'Content Flagged', {
                input: input.substring(0, 100) + '...',
                categories: flaggedCategories,
            });

            return {
                flagged: true,
                categories: flaggedCategories,
                reason: `Content flagged for: ${flaggedCategories.join(', ')}`,
            };
        }

        return { flagged: false, categories: [] };

    } catch (error: any) {
        // If moderation fails, log and allow (fail-open for availability)
        console.error('Moderation API error:', error.message);
        TraceLogger.log('moderation', 'API Error (Fail-Open)', { error: error.message });
        return { flagged: false, categories: [] };
    }
}

/**
 * User-friendly error message for flagged content.
 */
export function getModerationErrorMessage(result: ModerationResult): string {
    if (result.categories.includes('Self-Harm') || result.categories.includes('Self-Harm Intent')) {
        return "I can't help with content about self-harm. If you're struggling, please reach out to a crisis helpline. In the US, you can call or text 988 for the Suicide & Crisis Lifeline.";
    }

    if (result.categories.includes('Violence') || result.categories.includes('Graphic Violence')) {
        return "I can't help create content that promotes or describes violence.";
    }

    if (result.categories.includes('Hate Speech') || result.categories.includes('Threatening Hate Speech')) {
        return "I can't help create content that targets individuals or groups with hate.";
    }

    return "I can't help with this request as it may contain harmful content.";
}
