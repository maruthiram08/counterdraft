"use client";

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { Settings, Link2, Loader2, Check, X, ExternalLink, RefreshCw, User as UserIcon } from "lucide-react";
import { GlobalSidebar } from "@/components/navigation/GlobalSidebar";
import { RazorpayButton } from "@/components/billing/RazorpayButton";
import { useRouter } from 'next/navigation';

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
    const router = useRouter();
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
        <div className="flex h-screen bg-canvas overflow-hidden">
            <GlobalSidebar
                activeSection="settings"
                onNavigate={(section) => {
                    if (section === 'settings') return; // Already here
                    if (section === 'style') {
                        router.push('/style');
                        return;
                    }
                    // Navigate back to workspace with tab
                    router.push(`/workspace?tab=${section}`);
                }}
                onNewDraft={() => {
                    // Navigate to workspace to open modal
                    router.push('/workspace?action=new-draft');
                }}
                onImport={() => {
                    // Navigate to workspace to open import
                    router.push('/workspace?action=import');
                }}
            />

            <main className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden bg-canvas">
                <div className="flex-1 overflow-y-auto bg-canvas">
                    <div className="max-w-3xl mx-auto px-4 md:px-10 pt-8 md:pt-12 pb-28 md:pb-12">
                        {/* Page Header */}
                        <div className="mb-10">
                            <h1 className="text-4xl md:text-[56px] md:leading-[1.05] font-medium tracking-[-0.03em] text-ink flex items-center gap-4">
                                <Settings size={40} className="text-ember-500 shrink-0" />
                                Settings
                            </h1>
                            <p className="mt-3 text-base text-ink-soft">
                                Manage your account and connected platforms.
                            </p>
                        </div>

                        {/* Profile Section */}
                        <ProfileSection />

                        {/* Usage Section */}
                        <UsageSection />

                        {/* Integrations Section */}
                        <section className="mb-12">
                            <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-1 flex items-center gap-2">
                                <Link2 size={20} className="text-ember-500" />
                                Integrations
                            </h2>
                            <p className="text-sm text-ink-soft mb-6">
                                Connect platforms to import content and publish your drafts.
                            </p>

                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="animate-spin text-ink-muted" size={24} />
                                </div>
                            ) : error ? (
                                <div className="p-4 bg-rose-100 rounded-tile text-rose-700">
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
                </div>
            </main>
        </div>
    );
}

function ProfileSection() {
    const { user, isLoaded } = useUser();

    if (!isLoaded) {
        return (
            <div className="mb-12 p-6 md:p-8 bg-surface rounded-card shadow-card animate-pulse">
                <div className="h-6 bg-surface-muted w-1/4 mb-4 rounded"></div>
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-surface-muted rounded-full"></div>
                    <div className="space-y-2">
                        <div className="h-4 bg-surface-muted w-32 rounded"></div>
                        <div className="h-4 bg-surface-muted w-48 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <section className="mb-12">
            <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-1 flex items-center gap-2">
                <UserIcon size={20} className="text-ember-500" />
                Profile
            </h2>
            <p className="text-sm text-ink-soft mb-6">
                Your personal account details used in the workspace.
            </p>

            <div className="bg-surface rounded-card shadow-card p-6 md:p-8">
                <div className="flex items-center gap-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={user.imageUrl}
                        alt={user.fullName || "User"}
                        className="w-16 h-16 rounded-full shadow-raised"
                    />
                    <div>
                        <h3 className="text-2xl font-medium tracking-[-0.02em] text-ink">{user.fullName}</h3>
                        <p className="text-ink-muted">{user.primaryEmailAddress?.emailAddress}</p>
                    </div>
                </div>
            </div>
        </section>
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
        <div className={`bg-surface rounded-tile shadow-card p-5 transition-all ${connected
            ? 'ring-1 ring-sage-500/30'
            : available
                ? 'hover:shadow-float hover:-translate-y-0.5'
                : 'opacity-60'
            }`}>
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-full bg-canvas shadow-well flex items-center justify-center text-xl shrink-0">{icon}</div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-[17px] font-medium tracking-[-0.01em] text-ink">{name}</h3>
                            {connected && (
                                <span className="flex items-center gap-1 text-xs font-medium text-sage-700 bg-sage-100 px-2.5 py-0.5 rounded-full">
                                    <Check size={12} />
                                    Connected
                                </span>
                            )}
                            {!available && (
                                <span className="h-6 flex items-center text-xs font-medium text-ink-soft bg-canvas shadow-well px-2.5 rounded-full">
                                    Coming Soon
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-ink-muted mt-1">{description}</p>

                        {connected && profileName && (
                            <div className="mt-3 text-sm text-ink-soft">
                                Connected as <strong className="font-medium text-ink">{profileName}</strong>
                                {connectedAt && (
                                    <span className="text-ink-muted">
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
                                    className="flex items-center gap-1.5 h-10 px-4 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all disabled:opacity-50"
                                >
                                    <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                                    {syncing ? 'Syncing...' : 'Sync Posts'}
                                </button>
                            )}
                            <button
                                onClick={onDisconnect}
                                className="flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-medium text-rose-500 hover:text-rose-700 hover:bg-rose-100 active:shadow-pressed transition-all"
                            >
                                <X size={14} />
                                Disconnect
                            </button>
                        </>
                    ) : available ? (
                        <button
                            onClick={onConnect}
                            className="flex items-center gap-1.5 h-10 px-4 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all"
                        >
                            <ExternalLink size={14} />
                            Connect
                        </button>
                    ) : (
                        <button
                            disabled
                            className="h-10 px-4 rounded-full text-sm font-medium text-ink-muted cursor-not-allowed"
                        >
                            Coming Soon
                        </button>
                    )}
                </div>

                {/* Sync Result */}
                {lastSyncResult && platform === 'linkedin' && (
                    <div className="mt-3 pt-3 border-t border-line text-sm text-ink-soft">
                        <span className="text-sage-700 font-medium">{lastSyncResult.synced} posts synced</span>
                        {' · '}
                        <span>{lastSyncResult.eligible} eligible for beliefs</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function UsageSection() {
    const [usage, setUsage] = useState<{ usage: number; limit: number; tier: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/user/usage')
            .then(res => res.json())
            .then(data => {
                setUsage(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load usage", err);
                setLoading(false);
            });
    }, []);

    if (loading) return null;
    if (!usage) return null;

    const effectiveLimit = (usage.limit === Infinity || usage.limit === null) ? Infinity : usage.limit;
    const percent = effectiveLimit === Infinity ? 0 : Math.min(100, (usage.usage / effectiveLimit) * 100);
    const isUnlimited = usage.limit === Infinity || usage.limit === null;

    return (
        <section className="mb-12">
            <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-1 flex items-center gap-2">
                <Settings size={20} className="text-ember-500" /> {/* Reusing icon for visual consistency */}
                Plan & Usage
            </h2>
            <p className="text-sm text-ink-soft mb-6">
                Your monthly content generation limits.
            </p>

            <div className="bg-surface rounded-card shadow-card p-6 md:p-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-2xl font-medium tracking-[-0.02em] text-ink capitalize">{usage.tier} Plan</h3>
                            {usage.tier === 'free' && (
                                <div className="flex gap-2 items-center">
                                    <RazorpayButton
                                        planId="pro_monthly"
                                        buttonText="Upgrade to Pro (₹29)"
                                        className="text-xs h-8 px-3 rounded-full bg-ember-500 text-white font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all"
                                        onSuccess={() => window.location.reload()}
                                    />
                                </div>
                            )}
                        </div>
                        <p className="text-sm text-ink-muted">
                            {isUnlimited ? 'Unlimited drafts' : `${usage.limit} drafts per month`}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-medium tracking-[-0.03em] text-ink">
                            {usage.usage} <span className="text-sm text-ink-muted font-normal">/ {isUnlimited ? '∞' : usage.limit}</span>
                        </div>
                        <div className="text-xs text-ink-muted">Drafts used</div>
                    </div>
                </div>

                {!isUnlimited && (
                    <div className="w-full bg-canvas shadow-well rounded-full h-2.5 overflow-hidden">
                        <div
                            className={`h-2.5 rounded-full ${percent >= 90 ? 'bg-rose-500' : 'bg-ember-500'}`}
                            style={{ width: `${percent}%` }}
                        ></div>
                    </div>
                )}
            </div>
        </section>
    );
}
