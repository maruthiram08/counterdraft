import { useState, useMemo, useEffect } from "react";
import { VerificationResult, PlagiarismResult, SlopMatch, CompetitorCheckResult } from "@/components/editor/FactCheckSidebar";
import { AntiSlopService } from "@/lib/tools/anti-slop";
import { Draft } from "@/hooks/useDrafts";

interface UseVerificationProps {
    draft: Draft | null;
    content: string;
    onSave: (id: string, content: string) => Promise<boolean>;
    getFullContent: () => string;
}

export function useVerification({ draft, content, onSave, getFullContent }: UseVerificationProps) {
    const [showFactCheck, setShowFactCheck] = useState(false);
    const [verifications, setVerifications] = useState<VerificationResult[]>([]);
    const [verifying, setVerifying] = useState(false);
    const [plagiarismResult, setPlagiarismResult] = useState<PlagiarismResult | null>(null);
    const [checkingPlagiarism, setCheckingPlagiarism] = useState(false);
    const [slopMatches, setSlopMatches] = useState<SlopMatch[]>([]);
    const [slopLoading, setSlopLoading] = useState(false);
    const [competitorResult, setCompetitorResult] = useState<CompetitorCheckResult | null>(null);
    const [competitorLoading, setCompetitorLoading] = useState(false);

    // Explicit State for Human Audit Run
    const [slopHasRun, setSlopHasRun] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);

    // --- Persistence: Fetch existing verification results ---
    const fetchExistingVerification = async (id: string) => {
        setHistoryLoading(true);
        try {
            // Fetch Facts
            const factRes = await fetch(`/api/tools/fact-check?draftId=${id}`);
            if (factRes.ok) {
                const factData = await factRes.json();
                if (factData.results) setVerifications(factData.results);
            }

            // Fetch Plagiarism
            const plagRes = await fetch(`/api/tools/plagiarism-check?draftId=${id}`);
            if (plagRes.ok) {
                const plagData = await plagRes.json();
                if (plagData.result) setPlagiarismResult(plagData.result);
            }
        } catch (e) {
            console.error("Error fetching existing verification:", e);
        } finally {
            setHistoryLoading(false);
        }
    };

    // Reset state when draft changes
    useEffect(() => {
        if (!draft) {
            setVerifications([]);
            setPlagiarismResult(null);
            setSlopMatches([]);
            setCompetitorResult(null);
            setSlopHasRun(false);
            return;
        }

        setVerifications([]);
        setPlagiarismResult(null);
        setSlopMatches([]);
        setCompetitorResult(null);
        setShowFactCheck(false);

        fetchExistingVerification(draft.id);
    }, [draft]);

    const handleVerify = async () => {
        if (!draft) return;
        setVerifying(true);
        setShowFactCheck(true);

        try {
            // Auto-save first
            await onSave(draft.id, getFullContent());

            const res = await fetch('/api/tools/fact-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: content,
                    draftId: draft.id
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.results) {
                    setVerifications(data.results);
                }
            } else {
                console.error("Fact check failed with status:", res.status);
            }
        } catch (e) {
            console.error("Verification failed", e);
        } finally {
            setVerifying(false);
        }
    };

    const handlePlagiarismCheck = async () => {
        if (!draft) return;
        setCheckingPlagiarism(true);
        setShowFactCheck(true);

        try {
            await onSave(draft.id, getFullContent());

            const res = await fetch('/api/tools/plagiarism-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: content,
                    draftId: draft.id
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.result) {
                    setPlagiarismResult(data.result);
                }
            } else {
                console.error("Plagiarism check failed with status:", res.status);
            }
        } catch (e) {
            console.error("Plagiarism check failed", e);
        } finally {
            setCheckingPlagiarism(false);
        }
    };

    const handleSlopScan = async () => {
        if (!content) return;
        setSlopLoading(true);
        setShowFactCheck(true);

        try {
            // Simulate minimal delay for feel
            await new Promise(r => setTimeout(r, 600));
            const matches = AntiSlopService.scan(content);
            setSlopMatches(matches);
            setSlopHasRun(true);
        } catch (error) {
            console.error(error);
        } finally {
            setSlopLoading(false);
        }
    };

    const handleCompetitorCheck = async (competitorUrl?: string) => {
        if (!draft) return;
        setCompetitorLoading(true);
        setShowFactCheck(true);

        try {
            const res = await fetch('/api/tools/competitor-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: content,
                    competitorUrl
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.result) {
                    setCompetitorResult(data.result);
                }
            } else {
                console.error("Competitor check failed with status:", res.status);
            }
        } catch (e) {
            console.error("Competitor check failed", e);
        } finally {
            setCompetitorLoading(false);
        }
    };

    const handleRunMetric = async (type: 'fact' | 'uniqueness' | 'style' | 'run-all') => {
        if (type === 'run-all') {
            setShowFactCheck(true);
            await Promise.allSettled([
                handleVerify(),
                handlePlagiarismCheck(),
                handleSlopScan()
            ]);
            return;
        }

        if (type === 'fact') handleVerify();
        else if (type === 'uniqueness') handlePlagiarismCheck();
        else if (type === 'style') handleSlopScan();
    };

    // Memoized Scores
    const scores = useMemo(() => {
        const factHasRun = verifications.length > 0;
        const plagiarismHasRun = plagiarismResult !== null;
        const slopHasRunState = slopHasRun;

        // 1. Factuality Score (40%)
        let factScore = 0;
        if (factHasRun) {
            const verifiedCount = verifications.filter(v => v.status === 'verified').length;
            const disputedCount = verifications.filter(v => v.status === 'disputed').length;
            factScore = Math.max(0, (verifiedCount / verifications.length) * 100 - (disputedCount * 20));
        }

        // 2. Plagiarism Score (40%)
        const plagiarismScore = plagiarismResult ? plagiarismResult.uniqueness_score : 0;

        // 3. Style/Slop Score (20%)
        const slopScore = slopHasRunState ? Math.max(0, 100 - (slopMatches.length * 5)) : 0;

        // Aggregate Weighted Score
        const totalScore = Math.round((factScore * 0.4) + (plagiarismScore * 0.4) + (slopScore * 0.2));

        return {
            totalScore,
            fact: { score: factScore, hasRun: factHasRun, loading: verifying || historyLoading },
            uniqueness: { score: plagiarismScore, hasRun: plagiarismHasRun, loading: checkingPlagiarism || historyLoading },
            style: { score: slopScore, hasRun: slopHasRunState, loading: slopLoading }
        };
    }, [verifications, plagiarismResult, slopMatches, verifying, checkingPlagiarism, slopLoading, historyLoading, slopHasRun]);

    return {
        showFactCheck, setShowFactCheck,
        verifications,
        verifying,
        plagiarismResult,
        checkingPlagiarism,
        slopMatches, setSlopMatches,
        slopLoading,
        competitorResult,
        competitorLoading,
        historyLoading,
        handleVerify,
        handlePlagiarismCheck,
        handleSlopScan,
        handleCompetitorCheck,
        handleRunMetric,
        scores
    };
}
