
interface HeroDashboardProps {
    className?: string;
}

export const HeroInterface: React.FC<HeroDashboardProps> = ({ className }) => {
    return (
        <div className={`w-full h-full bg-[#FAFAFA] flex overflow-hidden ${className}`}>
            {/* SIDEBAR - Minimized for focus */}
            <div className="w-16 md:w-64 bg-white border-r border-zinc-200 flex flex-col flex-shrink-0 transition-all duration-300">
                <div className="p-4 md:p-6 border-b border-zinc-100 flex items-center justify-center md:justify-start gap-3">
                    <img src="/brand/logo-icon.png" alt="Icon" className="w-6 h-6 flex-shrink-0" />
                    <img src="/brand/logo-text.png" alt="Counterdraft" className="h-4 w-auto hidden md:block" />
                </div>
                <div className="p-4 space-y-2">
                    {['Dashboard', 'Journal', 'The Brain', 'Settings'].map((item, i) => (
                        <div key={item} className={`p-3 rounded-lg flex items-center gap-3 cursor-default ${i === 0 ? 'bg-green-50 text-green-700' : 'text-zinc-400'}`}>
                            <div className={`w-4 h-4 rounded ${i === 0 ? 'bg-green-600' : 'bg-zinc-200'}`}></div>
                            <span className={`text-sm font-bold hidden md:block ${i === 0 ? 'text-zinc-900' : ''}`}>{item}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* CANVAS - The "Real" Work */}
            <div className="flex-1 p-4 md:p-8 flex flex-col overflow-y-auto min-h-0">
                <div className="mb-6 md:mb-8 shrink-0">
                    <h2 className="text-2xl md:text-3xl font-serif text-zinc-900 mb-2">Morning, Alex.</h2>
                    <p className="text-sm md:text-base text-zinc-400 font-medium">Your strategy on <span className="text-zinc-900 border-b border-zinc-200 pb-0.5">"AI Sovereignty"</span> is trending.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-4">
                    {/* Active Draft Card */}
                    <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm flex flex-col relative group overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                        <div className="flex justify-between items-start mb-6">
                            <div className="px-2 py-1 bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-widest rounded">Developing</div>
                            <div className="text-xs text-zinc-400 font-mono">LAST_EDIT: 2m</div>
                        </div>

                        <h3 className="text-2xl md:text-3xl font-serif text-zinc-900 leading-tight mb-4">
                            Why the "Service Economy" is actually a Trap for Agencies.
                        </h3>
                        <p className="text-zinc-500 leading-relaxed mb-8 max-w-lg">
                            The traditional agency model relies on headcount scaling. In the age of leverage, this becomes a liability...
                        </p>

                        <div className="mt-auto flex items-center gap-4">
                            <button className="bg-zinc-900 text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors shadow-lg shadow-zinc-200">
                                Continue Writing
                            </button>
                            <div className="flex -space-x-2">
                                <div className="w-8 h-8 rounded-full border-2 border-white bg-zinc-100 flex items-center justify-center text-[9px] font-black text-zinc-400">AI</div>
                                <div className="w-8 h-8 rounded-full border-2 border-white bg-zinc-200 flex items-center justify-center text-[9px] font-black text-zinc-500">ME</div>
                            </div>
                            <span className="text-xs text-zinc-400 font-bold ml-2">Co-Authoring Active</span>
                        </div>
                    </div>

                    {/* Brain Stats Column */}
                    <div className="space-y-4">
                        {/* Stat 1 */}
                        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
                            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Audience Resonance</div>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-black text-zinc-900">94%</span>
                                <span className="text-xs font-bold text-green-600 mb-1.5">↑ 12%</span>
                            </div>
                            <div className="w-full h-1.5 bg-zinc-100 rounded-full mt-3 overflow-hidden">
                                <div className="h-full bg-green-500 w-[94%]"></div>
                            </div>
                        </div>

                        {/* Stat 2 */}
                        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between">
                            <div>
                                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Drafts Pending</div>
                                <div className="text-2xl font-black text-zinc-900">3</div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                            </div>
                        </div>

                        {/* Context Card */}
                        <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-900 shadow-sm text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                            <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Live Insight</div>
                            <p className="text-sm font-medium leading-relaxed opacity-90">
                                "Your argument on agency scaling conflicts with your previous post about 'Human-Centric Service'. Review stance?"
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
