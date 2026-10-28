'use client';

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { formatInviteDate } from "@/lib/billing/invite-utils";

const PENDING_KEY = 'pending_coupon';

function readPending(): string | null {
    try { return localStorage.getItem(PENDING_KEY); } catch { return null; }
}
function writePending(code: string | null) {
    try {
        if (code) localStorage.setItem(PENDING_KEY, code);
        else localStorage.removeItem(PENDING_KEY);
    } catch { /* storage blocked: the URL still carries the code */ }
}

// The invite rides along in ?invite=CODE after sign-up, so it survives in-app browsers and
// sign-in pop-ups that lose localStorage. Take it out of the URL once read.
function takeInviteFromUrl(): string | null {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('invite');
    if (!code) return null;
    url.searchParams.delete('invite');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    return code;
}

export function CouponClaimer() {
    const { isSignedIn, isLoaded, getToken } = useAuth();
    const started = useRef(false);

    useEffect(() => {
        if (!isLoaded || !isSignedIn || started.current) return;

        const fromUrl = takeInviteFromUrl();
        if (fromUrl) writePending(fromUrl);
        const pendingCode = fromUrl || readPending();
        if (!pendingCode) return;
        started.current = true;

        const claimCoupon = async () => {
            const toastId = toast.loading('Adding your invite…');
            try {
                const token = await getToken();
                const res = await fetch('/api/billing/claim-coupon', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ code: pendingCode }),
                });
                const data = await res.json().catch(() => ({}));

                if (res.ok) {
                    writePending(null);
                    toast.success(`Invite accepted. You're on Pro until ${formatInviteDate(data.period_end)}.`, { id: toastId, duration: 8000 });
                    // Onboarding doesn't show the plan; elsewhere reload so limits and badges update
                    if (!window.location.pathname.startsWith('/onboarding')) setTimeout(() => window.location.reload(), 1500);
                    return;
                }

                // Rate limits and network trouble: keep the code and try again on the next page
                if (res.status === 429 || res.status >= 500) {
                    started.current = false;
                    toast.error(data.error || "We couldn't add your invite yet. Open your invite link again in a few minutes.", { id: toastId });
                    return;
                }

                writePending(null);
                if (data.code === 'already_pro') {
                    toast(data.error, { id: toastId, duration: 10000 });
                    return;
                }
                toast.error(data.error || "We couldn't use that invite.", {
                    id: toastId,
                    duration: 20000,
                    description: 'You can still ask for a new invite or look at plans.',
                    action: { label: 'See options', onClick: () => window.location.assign(`/invite/${encodeURIComponent(pendingCode)}`) },
                });
            } catch (err) {
                console.error(err);
                started.current = false;
                toast.error("We couldn't add your invite yet. Check your connection.", { id: toastId });
            }
        };

        claimCoupon();
    }, [isLoaded, isSignedIn, getToken]);

    return null;
}
