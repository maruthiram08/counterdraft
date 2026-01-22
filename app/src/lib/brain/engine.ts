import { BrainMetadata, ContentItem, Outcome, Stance } from '@/types';

export interface BrainResult {
    confidence: number; // 0-100
    missingContext: string[]; // List of missing information
    suggestions: string[]; // Actionable advice
    isReady: boolean;
}

/**
 * The Brain Engine: Deterministic logic to evaluate content readiness.
 * 
 * Rules:
 * 1. Outcome must be defined.
 * 2. Audience must have Role + Pain.
 * 3. Stance must be defined for high confidence.
 * 4. References add to confidence.
 */
export function evaluateContent(item: ContentItem): BrainResult {
    const meta = item.brainMetadata;

    // Default result
    const result: BrainResult = {
        confidence: 0,
        missingContext: [],
        suggestions: [],
        isReady: false
    };

    if (!meta) {
        result.missingContext.push("No Brain metadata found. Please define Outcome and Audience.");
        result.suggestions.push("Click 'Brain settings' to define your goal.");
        return result;
    }

    // 1. Scoring Logic
    let score = 0;
    const maxScore = 100;

    // A. Outcome (Crucial: 30 pts)
    if (meta.outcome) {
        score += 30;
    } else {
        result.missingContext.push("Outcome is undefined");
        result.suggestions.push("Select a goal (e.g., Authority, Engagement).");
    }

    // B. Audience (Crucial: 30 pts)
    if (meta.audience && meta.audience.role && meta.audience.pain) {
        score += 30;
    } else {
        if (!meta.audience?.role) result.missingContext.push("Target Audience Role is missing");
        if (!meta.audience?.pain) result.missingContext.push("Audience Pain Point is missing");
        result.suggestions.push("Define who you are writing for.");
    }

    // C. Stance (Important: 20 pts)
    if (meta.stance) {
        score += 20;
    } else {
        result.missingContext.push("Stance is undefined");
        result.suggestions.push("Choose a stance (Supportive, Contrarian, etc.).");
    }

    // D. Context/References (Bonus: 20 pts)
    // If references exist or deep_dive research is done
    const hasReferences = meta.references && meta.references.length > 0;
    const hasResearch = item.deepDive && item.deepDive.research.length > 0;

    if (hasReferences || hasResearch) {
        score += 20;
    } else {
        result.suggestions.push("Add references or run a Deep Dive to increase confidence.");
    }

    // Final calculations
    result.confidence = score;
    result.isReady = score >= 80;

    // Specific advice based on combinations
    if (meta.outcome === 'authority' && meta.stance === 'supportive') {
        result.suggestions.push("Tip: To build authority while being supportive, cite specific examples or case studies.");
    }
    if (meta.outcome === 'authority' && meta.stance === 'contrarian') {
        result.suggestions.push("Tip: Contrarian authority requires strong evidence. Ensure your Deep Dive has data backing your claim.");
    }

    // Update confidence level string in metadata (this is a side effect, 
    // usually we'd return it, but here we just calculate the score for display)
    // The UI can map score -> Low/Medium/High

    return result;
}

export function getConfidenceLevel(score: number): 'low' | 'medium' | 'high' {
    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
}
