
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

import { toast } from "sonner";
import { formatInviteDate } from "@/lib/billing/invite-utils";
import { Loader } from "@/components/shared/Loading";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        if (!isLoaded) return;

        if (!user) {
            // Should be handled by middleware, but safe fallback
            router.push('/sign-in');
            return;
        }

        const checkOnboarding = async () => {
            try {
                // Check if we need to enforce onboarding
                // We'll query our API or check database
                // For speed, let's use a specialized endpoint
                const res = await fetch('/api/user/status');
                if (res.ok) {
                    const data = await res.json();
                    if (data.invite_applied) {
                        toast.success(`Your invite is on your account. You're on Pro until ${formatInviteDate(data.invite_applied)}.`, { duration: 8000 });
                    }
                    if (!data.onboarding_completed) {
                        router.push('/onboarding');
                        return;
                    }
                    announceBilling(data.usage?.pro_until ?? null, (path) => router.push(path));
                }
            } catch (e) {
                console.error("Failed to check onboarding status", e);
            } finally {
                setChecking(false);
            }
        };

        checkOnboarding();
    }, [isLoaded, user, router]);

    if (showLoading(isLoaded, checking)) {
        return (
            <Loader fullScreen />
        );
    }

    return <>{children}</>;
}

function showLoading(isLoaded: boolean, checking: boolean) {
    if (!isLoaded) return true;
    if (checking) return true;
    return false;
}

const RENEW_WINDOW_DAYS = 5;

// "Welcome to Pro" after checkout, and a once-per-session reminder when Pro is about to end
function announceBilling(proUntil: string | null, go: (path: string) => void) {
    const url = new URL(window.location.href);
    if (url.searchParams.get('upgraded') === 'true') {
        toast.success('Welcome to Pro. Everything is unlocked.');
        url.searchParams.delete('upgraded');
        window.history.replaceState(null, '', url.pathname + url.search);
        return;
    }

    if (!proUntil) return;
    const daysLeft = Math.ceil((new Date(proUntil).getTime() - Date.now()) / 86_400_000);
    if (daysLeft < 0 || daysLeft > RENEW_WINDOW_DAYS) return;

    try {
        if (sessionStorage.getItem('renew-reminder-shown')) return;
        sessionStorage.setItem('renew-reminder-shown', '1');
    } catch { /* storage blocked: show it anyway */ }

    const when = daysLeft <= 0 ? 'today' : daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`;
    toast(`Your Pro plan ends ${when}.`, {
        description: 'Renew to keep drafting without limits.',
        duration: 15000,
        action: { label: 'Renew', onClick: () => go('/pricing') },
    });
}
