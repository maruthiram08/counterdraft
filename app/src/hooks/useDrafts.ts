import { useState, useEffect, useCallback } from 'react';
import { Draft } from '@/types';

export function useDrafts() {
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDrafts = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/drafts', { cache: 'no-store' });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            setDrafts(data.drafts || []);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to fetch drafts';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    const saveDraft = async (beliefText: string, content: string): Promise<Draft | null> => {
        try {
            const res = await fetch('/api/drafts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ beliefText, content }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Add new draft to local state
            setDrafts(prev => [data.draft, ...prev]);
            return data.draft;
        } catch (err: unknown) {
            console.error('Error saving draft:', err);
            return null;
        }
    };

    const deleteDraft = async (id: string): Promise<boolean> => {
        try {
            const res = await fetch(`/api/drafts/${id}`, { method: 'DELETE' });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            // Remove from local state
            setDrafts(prev => prev.filter(d => d.id !== id));
            return true;
        } catch (err: unknown) {
            console.error('Error deleting draft:', err);
            return false;
        }
    };

    const updateDraft = async (id: string, updates: Partial<Pick<Draft, 'content' | 'status' | 'platform_metadata' | 'brain_metadata' | 'belief_text'>>): Promise<boolean> => {
        try {
            const res = await fetch(`/api/drafts/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Update local state
            setDrafts(prev => prev.map(d => d.id === id ? data.draft : d));
            return true;
        } catch (err: unknown) {
            console.error('Error updating draft:', err);
            return false;
        }
    };

    useEffect(() => {
        fetchDrafts();
    }, [fetchDrafts]);

    // Older drafts were titled with the idea's full brief; fix those once per session in the background
    useEffect(() => {
        if (loading) return;
        try {
            if (sessionStorage.getItem('drafts-retitled')) return;
            sessionStorage.setItem('drafts-retitled', '1');
        } catch { /* storage blocked: still worth one pass */ }

        (async () => {
            for (let pass = 0; pass < 3; pass++) {
                try {
                    const res = await fetch('/api/drafts/retitle', { method: 'POST' });
                    if (!res.ok) return;
                    const data: { updated: { id: string; title: string }[]; remaining: number } = await res.json();
                    if (data.updated.length > 0) {
                        const titles = new Map(data.updated.map(u => [u.id, u.title]));
                        setDrafts(prev => prev.map(d => titles.has(d.id) ? { ...d, belief_text: titles.get(d.id)! } : d));
                    }
                    if (data.remaining <= 0 || data.updated.length === 0) return;
                } catch {
                    return;
                }
            }
        })();
    }, [loading]);

    return {
        drafts,
        loading,
        error,
        saveDraft,
        deleteDraft,
        updateDraft,
        refetch: fetchDrafts,
    };
}
