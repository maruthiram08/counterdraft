'use client';

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function CouponClaimer() {
    const { isSignedIn, isLoaded, getToken } = useAuth();
    const [claimed, setClaimed] = useState(false);

    useEffect(() => {
        if (!isLoaded || !isSignedIn || claimed) return;

        const pendingCode = localStorage.getItem('pending_coupon');
        if (!pendingCode) return;

        const claimCoupon = async () => {
            try {
                // Show toast
                const toastId = toast.loading('Applying your invite code...');
                const token = await getToken();

                const res = await fetch('/api/billing/claim-coupon', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ code: pendingCode })
                });

                const data = await res.json();

                if (res.ok) {
                    toast.success('Invite Accepted! Pro Plan Activated.', { id: toastId });
                    localStorage.removeItem('pending_coupon');
                    setClaimed(true);

                    // Force refresh to update UI state if needed
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    toast.error(`Invite Failed: ${data.error}`, { id: toastId });
                    // Don't remove it? Or remove to prevent loop? 
                    // Better remove it to prevent endless error toasts.
                    localStorage.removeItem('pending_coupon');
                }
            } catch (err) {
                console.error(err);
                toast.error('Failed to process invite.');
            }
        };

        claimCoupon();
    }, [isLoaded, isSignedIn, claimed, getToken]);

    return null; // Invisible component
}
