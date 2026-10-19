import React from 'react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

export default function PhilosophyPage() {
    return (
        <div className="min-h-screen bg-canvas">
            <Navbar />

            <main className="pt-32 pb-24 md:pt-48 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
                <div className="text-center mb-20 animate-fade-in-up">
                    <div className="inline-flex items-center h-7 px-3 rounded-full bg-ink text-xs font-medium text-white mb-8">
                        THE MANIFESTO
                    </div>
                    <h1 className="text-5xl md:text-7xl font-medium tracking-[-0.03em] text-ink mb-8 leading-[1.05]">
                        The Age of <span className="text-ember-500">Generated Noise</span> requires a new kind of signal.
                    </h1>
                    <p className="text-xl text-ink-soft max-w-2xl mx-auto leading-relaxed">
                        We are drowning in average. The next era of thought leadership belongs to those who refuse to outsource their conviction.
                    </p>
                </div>

                <div className="prose prose-lg mx-auto bg-surface rounded-card shadow-card p-6 md:p-12 text-ink-soft prose-headings:text-ink prose-strong:text-ink animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <p>
                        The internet used to be a library of human thought. Now, it&apos;s becoming a landfill of generated approximations.
                        Large Language Models are brilliant engines of average—they calculate the most probable next word based on
                        everything that has already been said.
                    </p>
                    <p>
                        But <strong>thought leadership</strong> isn&apos;t about what&apos;s probable. It&apos;s about what&apos;s <em>missing</em>.
                    </p>

                    <h3 className="font-medium tracking-[-0.02em] text-ink mt-12 mb-6 text-2xl">The Counterdraft Belief</h3>
                    <ul className="space-y-4 list-none pl-0">
                        <li className="flex gap-4">
                            <span className="text-ember-500 font-medium">01.</span>
                            <span><strong>Strategy before Syntax.</strong> Don&apos;t write a word until you know exactly who you are fighting for and what you are fighting against.</span>
                        </li>
                        <li className="flex gap-4">
                            <span className="text-ember-500 font-medium">02.</span>
                            <span><strong>Friction is Quality.</strong> If it was easy to write, it&apos;s probably easy to forget. We build tools that add the <em>right kind</em> of friction—forcing you to clarify your stance.</span>
                        </li>
                        <li className="flex gap-4">
                            <span className="text-ember-500 font-medium">03.</span>
                            <span><strong>Own your Inputs.</strong> Your &quot;earned secrets&quot;—the lessons you paid for in experience—are the only asset AI cannot clone. Leverage them.</span>
                        </li>
                    </ul>

                    <div className="my-16 p-8 bg-canvas shadow-well rounded-tile border-l-4 border-l-ember-500 italic text-xl text-ink">
                        &quot;Write like a human who has actually lived through the problem.&quot;
                    </div>

                    <p>
                        Counterdraft is not an AI writer. It is an <strong>Intelligence Amplifier</strong>. We use AI to verify your arguments,
                        challenge your biases, and remix your core truths—but the truth itself must come from you.
                    </p>
                </div>
            </main>

            <Footer />
        </div>
    );
}
