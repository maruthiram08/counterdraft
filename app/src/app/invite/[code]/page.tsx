import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { Check, Ticket } from 'lucide-react';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { getOrCreateUser } from '@/lib/user-sync';
import { formatInviteDate, inviteState, normalizeInviteCode } from '@/lib/billing/invite-utils';
import { InviteActions, type InviteView } from './InviteClient';

interface Props {
    params: Promise<{ code: string }>
}

export const metadata = { title: 'Your Counterdraft invite' };

// Is this invite already on the signed-in person's account? (They opened the link again.)
async function redeemedByViewer(code: string): Promise<string | null | false> {
    const { userId: clerkId } = await auth();
    if (!clerkId) return false;
    const userId = await getOrCreateUser();
    if (!userId) return false;
    const { data: sub } = await supabase
        .from('subscriptions')
        .select('coupon_code, current_period_end')
        .eq('user_id', userId)
        .maybeSingle();
    return sub?.coupon_code === code ? (sub.current_period_end ?? null) : false;
}

export default async function InvitePage({ params }: Props) {
    const code = normalizeInviteCode((await params).code);
    const { userId: clerkId } = await auth();
    const signedIn = !!clerkId;

    // Slow down code guessing: this page tells you whether a code exists
    const ip = getClientIp(new Request('http://invite', { headers: await headers() }));
    if (!rateLimit(`invite:${ip}`, { windowMs: 15 * 60 * 1000, max: 20 }).allowed) {
        return (
            <InviteShell>
                <InviteCard title="Too many tries" body="Wait a few minutes, then open your invite link again." />
            </InviteShell>
        );
    }

    const { data: coupon } = await supabase
        .from('coupons')
        .select('code, discount_percent, max_redemptions, redemptions_count, expires_at, access_plans(display_name, validity_days)')
        .eq('code', code)
        .maybeSingle();

    const state = inviteState(coupon);

    // Discount codes are applied on the Pricing page
    if (state === 'discount') redirect(`/pricing?coupon=${encodeURIComponent(code)}`);

    if (state === 'used' || state === 'expired') {
        const mine = await redeemedByViewer(code);
        if (mine !== false) {
            const until = formatInviteDate(mine);
            return (
                <InviteShell>
                    <InviteCard
                        title="This invite is on your account"
                        body={until ? `You're on Pro until ${until}.` : "You're on Pro."}
                    />
                    <InviteActions view="mine" code={code} signedIn={signedIn} />
                </InviteShell>
            );
        }
    }

    const plan = (Array.isArray(coupon?.access_plans) ? coupon?.access_plans[0] : coupon?.access_plans) as { display_name?: string; validity_days?: number } | null | undefined;
    const days = plan?.validity_days || 30;
    const linkUntil = formatInviteDate(coupon?.expires_at);

    const views: Record<Exclude<typeof state, 'discount'>, { view: InviteView; title: string; body: string }> = {
        valid: {
            view: 'valid',
            title: "You're invited to Counterdraft",
            body: 'Counterdraft helps you write LinkedIn posts that sound like you, starting from what you already think.',
        },
        used: {
            view: 'used',
            title: 'This invite has already been used',
            body: "Each invite link works once. If you used it, sign in and you'll find Pro on your account. If not, ask the person who sent it for a new one.",
        },
        expired: {
            view: 'expired',
            title: 'This invite has expired',
            body: `${linkUntil ? `It was valid until ${linkUntil}. ` : ''}Ask for a new invite and we'll send you a fresh link.`,
        },
        missing: {
            view: 'missing',
            title: "We couldn't find that invite",
            body: 'Check the link or the code. Invite codes look like BETA- followed by 10 letters and numbers.',
        },
    };
    const v = views[state];

    return (
        <InviteShell>
            <InviteCard title={v.title} body={v.body}>
                {state === 'valid' && (
                    <ul className="mt-5 flex flex-col gap-3 text-left">
                        <Perk>Pro free for {days} days</Perk>
                        <Perk>No card needed, and nothing renews by itself</Perk>
                        {linkUntil && <Perk>Use this link by {linkUntil}. It works once.</Perk>}
                    </ul>
                )}
            </InviteCard>
            <InviteActions view={v.view} code={code} signedIn={signedIn} />
        </InviteShell>
    );
}

function InviteShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-dvh bg-canvas flex flex-col px-4 md:px-10 pt-5 md:pt-8 pb-6 safe-area-pb font-sans">
            <Link href="/" className="flex items-center gap-2 self-start md:self-center" aria-label="Counterdraft home">
                <Image src="/brand/logo-icon.png" alt="" width={32} height={32} className="h-8 w-8" />
                <Image src="/brand/logo-text.png" alt="Counterdraft" width={160} height={35} className="h-7 w-auto mt-0.5" />
            </Link>
            <main className="flex-1 w-full max-w-md mx-auto flex flex-col justify-end md:justify-center gap-5 pt-8">
                {children}
            </main>
        </div>
    );
}

function InviteCard({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
    return (
        <section className="bg-surface rounded-card shadow-card p-6 md:p-8">
            <div className="w-12 h-12 rounded-full bg-canvas shadow-raised text-ember-500 flex items-center justify-center mb-5">
                <Ticket size={22} />
            </div>
            <h1 className="text-[28px] leading-tight font-medium tracking-[-0.02em] text-ink text-balance">{title}</h1>
            <p className="mt-2 text-base text-ink-soft leading-relaxed">{body}</p>
            {children}
        </section>
    );
}

function Perk({ children }: { children: React.ReactNode }) {
    return (
        <li className="flex items-start gap-3 text-sm text-ink">
            <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-sage-100 text-sage-700 flex items-center justify-center">
                <Check size={12} strokeWidth={3} />
            </span>
            {children}
        </li>
    );
}
