import { useState, useEffect, useCallback } from 'react';

export interface IntegrationStatus {
    platform: string;
    connected: boolean;
    profileName?: string;
    profilePicture?: string;
    connectedAt?: string;
    scopes?: string[];
}

export function useIntegrations() {
    const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchIntegrations = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const res = await fetch('/api/integrations');
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            setIntegrations(data.integrations || []);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load integrations';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    const isConnected = useCallback((platform: string): boolean => {
        const integration = integrations.find(i => i.platform === platform);
        return integration?.connected ?? false;
    }, [integrations]);

    const getIntegration = useCallback((platform: string): IntegrationStatus | undefined => {
        return integrations.find(i => i.platform === platform);
    }, [integrations]);

    useEffect(() => {
        fetchIntegrations();
    }, [fetchIntegrations]);

    return {
        integrations,
        loading,
        error,
        isConnected,
        getIntegration,
        refetch: fetchIntegrations,
    };
}
