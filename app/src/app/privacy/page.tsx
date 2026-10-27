import React from 'react';
import type { Metadata } from 'next';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

export const metadata: Metadata = {
    title: 'Privacy Policy · Counterdraft',
    description: 'How Counterdraft and the CounterDraft Lens Chrome extension collect, use and protect your data.',
};

// Where privacy questions and deletion requests go.
const CONTACT_EMAIL = 'privacy@counterdraft.com';
const LAST_UPDATED = 'October 20, 2026';

const sectionHeading = 'font-medium tracking-[-0.02em] text-ink mt-12 mb-4 text-2xl';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-canvas">
            <Navbar />

            <main className="pt-28 pb-16 md:pt-48 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
                <div className="text-center mb-10 md:mb-16">
                    <div className="inline-flex items-center h-7 px-3 rounded-full bg-ink text-xs font-medium text-white mb-8">
                        LEGAL
                    </div>
                    <h1 className="text-4xl md:text-6xl font-medium tracking-[-0.03em] text-ink mb-6 leading-[1.05]">
                        Privacy Policy
                    </h1>
                    <p className="text-sm text-ink-muted">Last updated {LAST_UPDATED}</p>
                </div>

                <div className="prose prose-lg mx-auto bg-surface rounded-card shadow-card p-6 md:p-12 text-ink-soft prose-headings:text-ink prose-strong:text-ink">
                    <p>
                        This policy explains what Counterdraft (the web app at counterdraft.com) and the CounterDraft Lens
                        Chrome extension collect, why, and what you can do about it. We collect only what we need to help you
                        capture your thinking and turn it into writing, and we never sell your data.
                    </p>

                    <h2 className={sectionHeading}>What we collect</h2>
                    <ul>
                        <li><strong>Account details:</strong> your name, email address and profile picture from sign-up.</li>
                        <li><strong>Your content:</strong> the notes, beliefs, ideas, drafts, files and posts you create, import or sync.</li>
                        <li><strong>Connected accounts:</strong> if you connect LinkedIn, the access token and profile details needed to import your posts and publish on your behalf.</li>
                        <li><strong>Billing details:</strong> your plan and payment status. Card details are handled by our payment processors and never reach our servers.</li>
                        <li><strong>Usage data:</strong> pages visited and features used, so we can improve the product.</li>
                    </ul>

                    <h2 className={sectionHeading}>CounterDraft Lens (Chrome extension)</h2>
                    <p>Lens only acts when you open it and choose to capture something. When you do, it:</p>
                    <ul>
                        <li>Reads your Counterdraft sign-in cookie, so the capture is saved to your own account.</li>
                        <li>Takes a screenshot of the visible part of the current tab, or of the area you select.</li>
                        <li>Reads the page&apos;s URL and title, and sends them with your screenshot, your note and the reason you chose to Counterdraft.</li>
                    </ul>
                    <p>
                        Lens does not track your browsing, read pages you don&apos;t capture, or send data anywhere except
                        Counterdraft. The data it sends is used only to analyse and store your capture in your account.
                    </p>

                    <h2 className={sectionHeading}>How we use your data</h2>
                    <ul>
                        <li>To run the product: store your content, analyse captures, and generate drafts and suggestions.</li>
                        <li>To manage your account, subscription and connected platforms.</li>
                        <li>To understand usage and fix problems.</li>
                    </ul>
                    <p>
                        We do not sell your data, use it for advertising, or use it to decide creditworthiness or for lending.
                    </p>

                    <h2 className={sectionHeading}>Who we share it with</h2>
                    <p>We share data only with the services that run Counterdraft for us, and only what each one needs:</p>
                    <ul>
                        <li><strong>Clerk</strong> for sign-in and account management.</li>
                        <li><strong>Supabase</strong> for database storage.</li>
                        <li><strong>Vercel</strong> for hosting.</li>
                        <li><strong>AI model providers such as OpenAI</strong> to analyse your content and generate text. Their API terms do not allow them to train models on it.</li>
                        <li><strong>Tavily</strong> for web research you request.</li>
                        <li><strong>PostHog</strong> for product analytics.</li>
                        <li><strong>Razorpay</strong> for payments.</li>
                        <li><strong>LinkedIn</strong>, only if you connect it, to import and publish posts.</li>
                    </ul>
                    <p>We may also disclose data if the law requires it.</p>

                    <h2 className={sectionHeading}>Retention and deletion</h2>
                    <p>
                        We keep your data while your account is open. You can delete content in the app at any time, and you
                        can disconnect LinkedIn from Settings. To delete your account and all its data, email us and we will
                        do it within 30 days.
                    </p>

                    <h2 className={sectionHeading}>Security</h2>
                    <p>
                        Data is encrypted in transit, access to it is restricted, and connected-account tokens are stored
                        server side only.
                    </p>

                    <h2 className={sectionHeading}>Changes</h2>
                    <p>
                        If we change this policy, we will update the date above and, for significant changes, let you know in
                        the app or by email.
                    </p>

                    <h2 className={sectionHeading}>Contact</h2>
                    <p>
                        Questions or requests: <a href={`mailto:${CONTACT_EMAIL}`} className="text-ember-600">{CONTACT_EMAIL}</a>.
                    </p>
                </div>
            </main>

            <Footer />
        </div>
    );
}
