import { inferOutcomeWithLLM, analyzeConfidenceWithLLM } from '@/lib/openai';
import { logBrainAction } from './logger';
import { BrainAction, Outcome, Audience, ConfidenceResult, Belief } from '@/types';

export class BrainDecisionService {
    /**
     * Infers the best outcome (goal) for a piece of content.
     * Starts with heuristics, falls back to LLM if needed.
     */
    async inferOutcome(
        topic: string,
        audience?: Audience
    ): Promise<Outcome> {
        const startTime = Date.now();
        let method = 'heuristic';
        let outcome: Outcome | null = null;
        let reasoning = '';

        // 1. Simple Heuristics (Save tokens)
        const lowerTopic = topic.toLowerCase();
        if (lowerTopic.match(/how to|guide|tutorial|steps|learn/)) {
            outcome = 'authority';
            reasoning = 'Detected instructional keywords';
        } else if (lowerTopic.match(/\?|what if|imagine|story/)) {
            outcome = 'engagement';
            reasoning = 'Detected question or storytelling keywords';
        } else if (lowerTopic.match(/buy|sign up|join|offer|limited/)) {
            outcome = 'conversion';
            reasoning = 'Detected transactional keywords';
        } else if (lowerTopic.match(/struggle|failed|hard|vulnerable/)) {
            outcome = 'connection';
            reasoning = 'Detected vulnerability keywords';
        }

        // 2. LLM Fallback
        let llmResult: any = null;
        if (!outcome) {
            method = 'llm';
            try {
                const result = await inferOutcomeWithLLM(topic, audience);
                outcome = result.outcome as Outcome;
                reasoning = result.reasoning;
                llmResult = result;
            } catch (error) {
                console.error('Brain Inference Failed:', error);
                // Default fallback
                outcome = 'authority';
                reasoning = 'Fallback due to error';
            }
        }

        const latency = Date.now() - startTime;

        // 3. Log Trace
        await logBrainAction({
            action: 'outcome_inference',
            inputContext: { topic, audience, method },
            outputResult: { outcome, reasoning },
            modelConfig: { model: method === 'llm' ? 'gpt-4o' : 'heuristic' },
            latencyMs: latency
        });

        return outcome || 'authority';
    }

    /**
     * Calculates confidence score by checking alignment with existing beliefs.
     */
    async calculateConfidence(
        topic: string,
        beliefs: Belief[]
    ): Promise<ConfidenceResult> {
        const startTime = Date.now();

        // If no beliefs to check against, return neutral
        if (beliefs.length === 0) {
            return {
                level: 'medium',
                score: 50,
                reasoning: 'No existing beliefs to compare against.'
            };
        }

        let result: ConfidenceResult;

        try {
            // We pass all beliefs for now (v1). 
            // In v2 we would use vector search to find only relevant ones.
            const analysis = await analyzeConfidenceWithLLM(topic, beliefs as any);

            result = {
                level: analysis.level,
                score: analysis.score,
                reasoning: analysis.reasoning,
                conflictingBeliefIds: analysis.conflictingBeliefIds
            };

        } catch (error) {
            console.error('Confidence Calculation Failed:', error);
            result = {
                level: 'medium',
                score: 50,
                reasoning: 'Analysis failed, defaulting to neutral.'
            };
        }

        const latency = Date.now() - startTime;

        // Log Trace
        await logBrainAction({
            action: 'confidence_calculation',
            inputContext: { topic, beliefCount: beliefs.length },
            outputResult: result,
            modelConfig: { model: 'gpt-4o' },
            latencyMs: latency
        });

        return result;
    }
}

export const brainService = new BrainDecisionService();
