
import Image from 'next/image';

interface HeroDashboardProps {
    className?: string;
}

export const HeroInterface: React.FC<HeroDashboardProps> = ({ className }) => {
    return (
        <div className={`w-full h-full bg-canvas flex overflow-hidden text-left ${className}`}>
            {/* SIDEBAR - Minimized for focus */}
            <div className="hidden md:flex w-16 md:w-60 bg-canvas flex-col flex-shrink-0 transition-all duration-300">
                <div className="p-4 md:p-6 flex items-center justify-center md:justify-start gap-3">
                    <Image src="/brand/logo-icon.png" alt="Icon" width={24} height={24} className="w-6 h-6 flex-shrink-0" />
                    <Image src="/brand/logo-text.png" alt="Counterdraft" width={120} height={16} className="h-4 w-auto hidden md:block" />
                </div>
                <div className="p-4 space-y-3">
                    {['Dashboard', 'My Drafts', 'Ideas', 'Settings'].map((item, i) => (
                        <div key={item} className={`h-11 px-4 rounded-full flex items-center gap-3 cursor-default ${i === 0 ? 'bg-canvas shadow-pressed text-ember-600' : 'text-ink-muted'}`}>
                            <div className={`w-4 h-4 rounded-full ${i === 0 ? 'bg-ember-500' : 'bg-canvas shadow-well'}`}></div>
                            <span className={`text-sm font-medium hidden md:block ${i === 0 ? 'text-ink' : ''}`}>{item}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* CANVAS - The "Real" Work */}
            <div className="flex-1 p-4 md:p-8 flex flex-col overflow-y-auto min-h-0">
                <div className="mb-6 md:mb-8 shrink-0">
                    <h2 className="text-3xl md:text-[40px] md:leading-[1.05] font-medium tracking-[-0.03em] text-ink mb-2">Morning, Alex.</h2>
                    <p className="text-sm md:text-base text-ink-soft">Your latest <span className="text-ink font-medium border-b border-ember-200 pb-0.5">LinkedIn post</span> is picking up engagement.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pb-4">
                    {/* Active Draft Card */}
                    <div className="lg:col-span-2 bg-surface rounded-card p-6 md:p-8 shadow-card flex flex-col relative group overflow-hidden">
                                                <div className="flex justify-between items-start mb-6">
                            <div className="h-7 px-3 flex items-center bg-sand-100 text-sand-700 text-xs font-medium rounded-full">Developing</div>
                            <div className="text-xs text-ink-muted font-mono">LAST_EDIT: 2m</div>
                        </div>

                        <h3 className="text-2xl md:text-[28px] font-medium tracking-[-0.02em] text-ink leading-tight mb-4">
                            Why consistency beats virality for building an audience.
                        </h3>
                        <p className="text-ink-soft leading-relaxed mb-8 max-w-lg">
                            Most creators chase viral moments. But the real growth comes from showing up consistently with ideas that resonate with your specific reader...
                        </p>

                        <div className="mt-auto flex flex-wrap items-center gap-3 md:gap-4">
                            <button className="h-10 px-4 whitespace-nowrap rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all">
                                Continue Writing
                            </button>
                            <div className="flex -space-x-2">
                                <div className="w-8 h-8 rounded-full border-2 border-surface bg-ink flex items-center justify-center text-[10px] font-medium text-white">AI</div>
                                <div className="w-8 h-8 rounded-full border-2 border-surface bg-ember-100 flex items-center justify-center text-[10px] font-medium text-ember-700">ME</div>
                            </div>
                            <span className="hidden sm:inline text-xs text-ink-muted ml-2">AI assists, you&apos;re in control</span>
                        </div>
                    </div>

                    {/* Brain Stats Column */}
                    <div className="space-y-4">
                        {/* Stat 1 */}
                        <div className="bg-surface p-5 rounded-tile shadow-card">
                            <div className="text-sm text-ink-muted mb-2">Originality Score</div>
                            <div className="flex items-end gap-2">
                                <span className="text-4xl font-medium tracking-[-0.03em] text-ink">94%</span>
                                <span className="text-xs font-medium text-sage-700 bg-sage-100 rounded-full px-2 py-0.5 mb-1.5">↑ 12%</span>
                            </div>
                            <div className="w-full h-1.5 bg-canvas shadow-well rounded-full mt-3 overflow-hidden">
                                <div className="h-full bg-ember-500 rounded-full w-[94%]"></div>
                            </div>
                        </div>

                        {/* Stat 2 */}
                        <div className="bg-surface p-5 rounded-tile shadow-card flex items-center justify-between">
                            <div>
                                <div className="text-sm text-ink-muted mb-1">Drafts Pending</div>
                                <div className="text-3xl font-medium tracking-[-0.03em] text-ink">3</div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-canvas shadow-well flex items-center justify-center text-dusk-500">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                            </div>
                        </div>

                        {/* Context Card */}
                        <div className="bg-ink p-5 rounded-tile shadow-card text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-ember-500 opacity-20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                            <div className="text-sm text-white/60 mb-3">Writing Tip</div>
                            <p className="text-sm font-medium leading-relaxed opacity-90">
                                &quot;Your intro hook is strong. Consider adding a specific example in paragraph 2 to make it more relatable.&quot;
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
