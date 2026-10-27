import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

export const metadata: Metadata = {
    title: 'Terms of Service · Counterdraft',
    description: 'The terms for using Counterdraft and the CounterDraft Lens Chrome extension, including plans and payments.',
};

// Same inbox as the privacy policy
const CONTACT_EMAIL = 'privacy@counterdraft.com';
const LAST_UPDATED = 'October 27, 2026';

const sectionHeading = 'font-medium tracking-[-0.02em] text-ink mt-12 mb-4 text-2xl';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-canvas">
            <Navbar />

            <main className="pt-28 pb-16 md:pt-48 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
                <div className="text-center mb-10 md:mb-16">
                    <div className="inline-flex items-center h-7 px-3 rounded-full bg-ink text-xs font-medium text-white mb-8">
                        LEGAL
                    </div>
                    <h1 className="text-4xl md:text-6xl font-medium tracking-[-0.03em] text-ink mb-6 leading-[1.05]">
                        Terms of Service
                    </h1>
                    <p className="text-sm text-ink-muted">Last updated {LAST_UPDATED}</p>
                </div>

                <div className="prose prose-lg mx-auto bg-surface rounded-card shadow-card p-6 md:p-12 text-ink-soft prose-headings:text-ink prose-strong:text-ink">
                    <p>
                        These terms cover your use of Counterdraft (the web app at counterdraft.com) and the CounterDraft
                        Lens Chrome extension. By creating an account or using either, you agree to them. If you don&apos;t
                        agree, please don&apos;t use Counterdraft.
                    </p>

                    <h2 className={sectionHeading}>Your account</h2>
                    <ul>
                        <li>You need an account to use the app. Keep your sign-in details safe; you are responsible for what happens under your account.</li>
                        <li>Give us a real email address so we can reach you about your account and payments.</li>
                        <li>You must be old enough to agree to these terms where you live.</li>
                    </ul>

                    <h2 className={sectionHeading}>Your content</h2>
                    <p>
                        What you write, import or capture stays yours. You give us permission to store and process it only to
                        run Counterdraft for you: saving it, analysing it, and generating drafts and suggestions from it.
                        How we handle it is described in our <Link href="/privacy" className="text-ember-600">Privacy Policy</Link>.
                    </p>
                    <p>
                        Drafts and suggestions are produced with AI and can be wrong. Read and edit everything before you post
                        it. You are responsible for what you publish, including on LinkedIn or any other platform.
                    </p>

                    <h2 className={sectionHeading}>Acceptable use</h2>
                    <p>Don&apos;t use Counterdraft to:</p>
                    <ul>
                        <li>Break the law or the rules of the platforms you post to.</li>
                        <li>Create spam, harassment, or content that infringes someone else&apos;s rights.</li>
                        <li>Try to break, overload, copy or get around the limits of the service.</li>
                        <li>Share your account or resell access.</li>
                    </ul>
                    <p>We may suspend or close accounts that do.</p>

                    <h2 className={sectionHeading}>Plans and payments</h2>
                    <ul>
                        <li>A free Starter account lets you set up your voice and look around. Drafting, research and images need a Pro plan.</li>
                        <li>Pro is paid in advance for one month or one year through Razorpay. Prices are shown on the <Link href="/pricing" className="text-ember-600">Pricing</Link> page before you pay.</li>
                        <li>Payments do not renew automatically. When your period ends, your account returns to Starter unless you pay again. Paying before it ends adds the new period to the time you have left.</li>
                        <li>Payments are not refundable, except for duplicate charges or where the law requires a refund. If something went wrong with a payment, email us and we will look into it.</li>
                        <li>Coupon and invite codes are for the person they were given to, can expire, and have no cash value.</li>
                    </ul>

                    <h2 className={sectionHeading}>Connected accounts</h2>
                    <p>
                        To post to LinkedIn from Counterdraft you need to connect your LinkedIn account. We only post when
                        you ask us to. You can disconnect it from Settings at any time. Your use of LinkedIn is also covered
                        by LinkedIn&apos;s own terms.
                    </p>

                    <h2 className={sectionHeading}>Changes to the service</h2>
                    <p>
                        Counterdraft is still growing. We may add, change or remove features. Features marked
                        &quot;Coming soon&quot; are not available yet and may change before they arrive.
                    </p>

                    <h2 className={sectionHeading}>Ending your account</h2>
                    <p>
                        You can stop using Counterdraft at any time. To delete your account and its data, email us. We may
                        close an account that breaks these terms.
                    </p>

                    <h2 className={sectionHeading}>Disclaimers and liability</h2>
                    <p>
                        Counterdraft is provided as it is. We work to keep it running and your data safe, but we can&apos;t
                        promise it will always be available or error free. To the extent the law allows, we are not liable
                        for indirect or consequential losses, and our total liability to you is limited to what you paid us
                        in the 12 months before the claim.
                    </p>

                    <h2 className={sectionHeading}>Governing law</h2>
                    <p>These terms are governed by the laws of India.</p>

                    <h2 className={sectionHeading}>Changes to these terms</h2>
                    <p>
                        If we change these terms, we will update the date above and, for significant changes, let you know
                        in the app or by email.
                    </p>

                    <h2 className={sectionHeading}>Contact</h2>
                    <p>
                        Questions: <a href={`mailto:${CONTACT_EMAIL}`} className="text-ember-600">{CONTACT_EMAIL}</a>.
                    </p>
                </div>
            </main>

            <Footer />
        </div>
    );
}
