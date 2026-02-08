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
