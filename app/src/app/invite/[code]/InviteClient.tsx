'use client';

import { ArrowRight } from "lucide-react";

export default function InviteClient({ code }: { code: string }) {
    const handleAccept = () => {
        // 1. Store code for post-signup claiming
        localStorage.setItem('pending_coupon', code);

        // 2. Redirect to Auth logic
        // We redirect to a dedicated sign-up-sso logic or just home.
        // Clerk will handle the auth. 
        // We'll redirect to /workspace, which triggers Clerk's "SignIn if not auth" logic
        window.location.assign('/workspace');
    };

    return (
        <button
            onClick={handleAccept}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
        >
            Accept Invite & Join
            <ArrowRight size={18} />
        </button>
    );
}
