import { scoreCriteria, toStrategyAnalysis, totalScore, weakestCriterion } from '@/lib/brain/strategy';

describe('toStrategyAnalysis', () => {
    it('maps the strategy check response to what the panel shows', () => {
        const criteria = scoreCriteria({ audience: { rating: 4, note: 'Talks to dads' } });
        expect(toStrategyAnalysis({
            score: 72,
            critique: 'The hook is strong but the CTA is vague.',
            weaknesses: ['No proof point'],
            actionable_fix: 'End with one concrete question for parents.',
            criteria,
        })).toEqual({
            score: 72,
            analysis: 'The hook is strong but the CTA is vague.',
            suggestions: ['End with one concrete question for parents.'],
            criteria,
        });
    });

    it('survives an empty or odd response', () => {
        expect(toStrategyAnalysis({})).toEqual({ score: 0, analysis: '', suggestions: [], criteria: [] });
        expect(toStrategyAnalysis({ score: '140', analysis: 'ok', suggestions: ['a', '', 'a'] })).toEqual({ score: 100, analysis: 'ok', suggestions: ['a'], criteria: [] });
    });

    it('offers no fix when the check found nothing left to fix', () => {
        expect(toStrategyAnalysis({ score: 92, critique: 'Works.', weaknesses: ['tiny nit'], actionable_fix: '' }).suggestions).toEqual([]);
    });
});

describe('strategy rubric', () => {
    it('computes the score from ratings, so the same ratings always give the same score', () => {
        const criteria = scoreCriteria({
            audience: { rating: 5 }, stance: { rating: 4 }, goal: { rating: 3 }, brief: { rating: 5 }, clarity: { rating: 2 },
        });
        expect(criteria.map(c => c.points)).toEqual([25, 16, 15, 20, 4]);
        expect(totalScore(criteria)).toBe(80);
    });

    it('clamps bad ratings and fills missing criteria with zero', () => {
        const criteria = scoreCriteria({ audience: { rating: 9 }, stance: 'x', goal: 3.6 });
        expect(criteria.map(c => c.rating)).toEqual([5, 0, 4, 0, 0]);
    });

    it('picks the criterion losing the most points, and none once all are 4 or 5', () => {
        expect(weakestCriterion(scoreCriteria({ audience: { rating: 3 }, stance: { rating: 5 }, goal: { rating: 2 }, brief: { rating: 5 }, clarity: { rating: 0 } }))?.key).toBe('goal');
        expect(weakestCriterion(scoreCriteria({ audience: { rating: 4 }, stance: { rating: 5 }, goal: { rating: 4 }, brief: { rating: 5 }, clarity: { rating: 4 } }))).toBeUndefined();
    });
});
