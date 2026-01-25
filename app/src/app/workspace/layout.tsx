
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

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
                    if (!data.onboarding_completed) {
                        router.push('/onboarding');
                        return;
                    }
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
            <div className="h-screen flex items-center justify-center bg-[var(--background)]">
                <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    return <>{children}</>;
}

function showLoading(isLoaded: boolean, checking: boolean) {
    if (!isLoaded) return true;
    if (checking) return true;
    return false;
}
