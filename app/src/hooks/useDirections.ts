import { useState, useEffect } from 'react';

interface Direction {
    theme: string;
    topic: string;
    strengthensBelief?: string;
    exploresTension?: string;
    risksWeakening?: string;
    openingLine?: string;
    rationale: string;
}

export function useDirections() {
    const [directions, setDirections] = useState<Direction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generated, setGenerated] = useState(false);

    const generateDirections = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/directions');
            const data = await res.json();

            if (data.ideas) {
                setDirections(data.ideas);
                setGenerated(true);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return { directions, loading, error, generated, generateDirections };
}
