import React from 'react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

export default function PhilosophyPage() {
    return (
        <div className="min-h-screen bg-[#fcfcfc]">
            <Navbar />

            <main className="pt-32 pb-24 md:pt-48 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
                <div className="text-center mb-20 animate-fade-in-up">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-zinc-900 text-[10px] font-bold text-white mb-8 tracking-widest uppercase">
                        THE MANIFESTO
                    </div>
                    <h1 className="font-display text-5xl md:text-7xl font-black tracking-tighter text-zinc-900 mb-8 leading-[1.1]">
                        The Age of <span className="text-green-600">Generated Noise</span> requires a new kind of signal.
                    </h1>
                    <p className="text-xl text-zinc-500 max-w-2xl mx-auto leading-relaxed">
                        We are drowning in average. The next era of thought leadership belongs to those who refuse to outsource their conviction.
                    </p>
                </div>

                <div className="prose prose-lg prose-zinc mx-auto animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <p>
                        The internet used to be a library of human thought. Now, it's becoming a landfill of generated approximations.
                        Large Language Models are brilliant engines of average—they calculate the most probable next word based on
                        everything that has already been said.
                    </p>
                    <p>
                        But <strong>thought leadership</strong> isn't about what's probable. It's about what's <em>missing</em>.
                    </p>

                    <h3 className="font-display font-bold mt-12 mb-6 text-2xl">The Counterdraft Belief</h3>
                    <ul className="space-y-4 list-none pl-0">
                        <li className="flex gap-4">
                            <span className="text-green-600 font-bold">01.</span>
                            <span><strong>Strategy before Syntax.</strong> Don't write a word until you know exactly who you are fighting for and what you are fighting against.</span>
                        </li>
                        <li className="flex gap-4">
                            <span className="text-green-600 font-bold">02.</span>
                            <span><strong>Friction is Quality.</strong> If it was easy to write, it's probably easy to forget. We build tools that add the <em>right kind</em> of friction—forcing you to clarify your stance.</span>
                        </li>
                        <li className="flex gap-4">
                            <span className="text-green-600 font-bold">03.</span>
                            <span><strong>Own your Inputs.</strong> Your "earned secrets"—the lessons you paid for in experience—are the only asset AI cannot clone. Leverage them.</span>
                        </li>
                    </ul>

                    <div className="my-16 p-8 bg-zinc-50 border border-zinc-100 rounded-2xl border-l-4 border-l-green-600 italic text-xl text-zinc-700">
                        "Write like a human who has actually lived through the problem."
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
