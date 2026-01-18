"use client";

import { useState, useEffect, useCallback } from 'react';
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Settings, Link2, Loader2, Check, X, ExternalLink, RefreshCw } from "lucide-react";

interface IntegrationStatus {
    platform: string;
    connected: boolean;
    profileName?: string;
    profilePicture?: string;
    connectedAt?: string;
    scopes?: string[];
}

const PLATFORM_INFO: Record<string, { name: string; description: string; icon: string; available: boolean }> = {
    linkedin: {
        name: 'LinkedIn',
        description: 'Import your posts and publish drafts directly to LinkedIn.',
        icon: '🔗',
        available: true,
    },
    notion: {
        name: 'Notion',
        description: 'Import pages and databases to extract beliefs from your notes.',
        icon: '📝',
        available: false, // Coming soon
    },
    google_docs: {
        name: 'Google Docs',
        description: 'Import documents to analyze your writing patterns.',
        icon: '📄',
        available: false, // Coming soon
    },
};

export default function SettingsPage() {
    const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [syncing, setSyncing] = useState<string | null>(null);
    const [syncResult, setSyncResult] = useState<{ synced: number; eligible: number } | null>(null);

    const fetchIntegrations = useCallback(async () => {
        try {
            setLoading(true);
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

    useEffect(() => {
        fetchIntegrations();
    }, [fetchIntegrations]);

    const handleConnect = (platform: string) => {
        // Will redirect to OAuth flow
        window.location.href = `/api/${platform}/auth`;
    };

    const handleDisconnect = async (platform: string) => {
        try {
            const res = await fetch(`/api/${platform}/disconnect`, { method: 'POST' });
            if (res.ok) {
                fetchIntegrations();
            }
        } catch (err) {
            console.error('Failed to disconnect:', err);
        }
    };

    const handleSync = async (platform: string) => {
        try {
            setSyncing(platform);
            setSyncResult(null);
            const res = await fetch(`/api/${platform}/sync`, { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setSyncResult({ synced: data.synced, eligible: data.eligible });
            } else {
                setError(data.error || 'Sync failed');
            }
        } catch (err) {
            console.error('Failed to sync:', err);
            setError('Failed to sync posts');
        } finally {
            setSyncing(null);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <Header />

            <main className="flex-1 py-12">
                <div className="container max-w-3xl">
                    {/* Page Header */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-semibold mb-2 flex items-center gap-3">
                            <Settings size={24} />
                            Settings
                        </h1>
                        <p className="text-[var(--text-muted)]">
                            Manage your account and connected platforms.
                        </p>
                    </div>

                    {/* Integrations Section */}
                    <section className="mb-12">
                        <h2 className="text-lg font-medium mb-1 flex items-center gap-2">
                            <Link2 size={18} />
                            Integrations
                        </h2>
                        <p className="text-sm text-[var(--text-muted)] mb-6">
                            Connect platforms to import content and publish your drafts.
                        </p>

                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="animate-spin text-[var(--text-muted)]" size={24} />
                            </div>
                        ) : error ? (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                                {error}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {integrations.map((integration) => {
                                    const info = PLATFORM_INFO[integration.platform];
                                    if (!info) return null;

                                    return (
                                        <IntegrationCard
                                            key={integration.platform}
                                            platform={integration.platform}
                                            name={info.name}
                                            description={info.description}
                                            icon={info.icon}
                                            connected={integration.connected}
                                            profileName={integration.profileName}
                                            profilePicture={integration.profilePicture}
                                            connectedAt={integration.connectedAt}
                                            available={info.available}
                                            onConnect={() => handleConnect(integration.platform)}
                                            onDisconnect={() => handleDisconnect(integration.platform)}
                                            onSync={() => handleSync(integration.platform)}
                                            syncing={syncing === integration.platform}
                                            lastSyncResult={syncResult}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
}

interface IntegrationCardProps {
    platform: string;
    name: string;
    description: string;
    icon: string;
    connected: boolean;
    profileName?: string;
    profilePicture?: string;
    connectedAt?: string;
    available: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
    onSync?: () => Promise<void>;
    syncing?: boolean;
    lastSyncResult?: { synced: number; eligible: number } | null;
}

function IntegrationCard({
    platform,
    name,
    description,
    icon,
    connected,
    profileName,
    connectedAt,
    available,
    onConnect,
    onDisconnect,
    onSync,
    syncing,
    lastSyncResult,
}: IntegrationCardProps) {
    return (
        <div className={`p-5 border rounded-lg transition-colors ${connected
            ? 'border-green-200 bg-green-50/30'
            : available
                ? 'border-[var(--border)] hover:border-[var(--border-hover)]'
                : 'border-[var(--border)] opacity-60'
            }`}>
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                    <div className="text-2xl">{icon}</div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-medium">{name}</h3>
                            {connected && (
                                <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                                    <Check size={12} />
                                    Connected
                                </span>
                            )}
                            {!available && (
                                <span className="text-xs text-[var(--text-muted)] bg-gray-100 px-2 py-0.5 rounded-full">
                                    Coming Soon
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-[var(--text-muted)] mt-1">{description}</p>

                        {connected && profileName && (
                            <div className="mt-3 text-sm text-[var(--text-secondary)]">
                                Connected as <strong>{profileName}</strong>
                                {connectedAt && (
                                    <span className="text-[var(--text-muted)]">
                                        {' · '}
                                        {new Date(connectedAt).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                    {connected ? (
                        <>
                            {platform === 'linkedin' && onSync && (
                                <button
                                    onClick={onSync}
                                    disabled={syncing}
                                    className="flex items-center gap-1.5 text-sm font-medium text-[var(--foreground)] bg-[var(--surface)] border border-[var(--border)] px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                                >
                                    <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                                    {syncing ? 'Syncing...' : 'Sync Posts'}
                                </button>
                            )}
                            <button
                                onClick={onDisconnect}
                                className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors"
                            >
                                <X size={14} />
                                Disconnect
                            </button>
                        </>
                    ) : available ? (
                        <button
                            onClick={onConnect}
                            className="flex items-center gap-1.5 text-sm font-medium text-[var(--foreground)] bg-[var(--surface)] border border-[var(--border)] px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
                        >
                            <ExternalLink size={14} />
                            Connect
                        </button>
                    ) : (
                        <button
                            disabled
                            className="text-sm text-[var(--text-muted)] px-4 py-2 rounded-md cursor-not-allowed"
                        >
                            Coming Soon
                        </button>
                    )}
                </div>

                {/* Sync Result */}
                {lastSyncResult && platform === 'linkedin' && (
                    <div className="mt-3 pt-3 border-t border-[var(--border)] text-sm text-[var(--text-secondary)]">
                        <span className="text-green-600 font-medium">{lastSyncResult.synced} posts synced</span>
                        {' · '}
                        <span>{lastSyncResult.eligible} eligible for beliefs</span>
                    </div>
                )}
            </div>
        </div>
    );
}
