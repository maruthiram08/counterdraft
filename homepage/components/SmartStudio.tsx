import React, { useState } from 'react';

export const SmartStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState('linkedin');

  return (
    <div className="bg-white rounded-3xl border border-zinc-200 p-1.5 min-h-[580px] flex flex-col editorial-shadow animate-fade-in-up">
      <div className="flex items-center justify-between p-6 border-b border-zinc-100 bg-zinc-50/50 rounded-t-[22px]">
        <div className="flex gap-2">
           {['linkedin', 'x-thread', 'editorial'].map(tab => (
             <button 
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`text-[10px] uppercase font-black tracking-[0.25em] transition-all px-5 py-3 rounded-xl border ${activeTab === tab ? 'bg-white border-zinc-300 text-zinc-900 shadow-sm' : 'text-zinc-400 border-transparent hover:text-zinc-600 hover:border-zinc-200'}`}
             >
               {tab}
             </button>
           ))}
        </div>
        <div className="hidden md:flex items-center gap-4">
          <div className="text-right">
             <div className="text-[8px] text-zinc-400 font-mono tracking-widest uppercase font-bold">REMIXING_CONTEXT...</div>
             <div className="h-1 w-28 bg-zinc-200 rounded-full mt-1.5 overflow-hidden">
                <div className="h-full bg-green-600 w-3/4 animate-pulse"></div>
             </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-2 gap-16 overflow-hidden">
        {/* Source Side */}
        <div className="space-y-8 lg:border-r lg:border-zinc-100 lg:pr-12">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-zinc-300 tracking-[0.3em] uppercase">INPUT: TRUTH_SOURCE.MD</span>
            <div className="flex gap-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
               <div className="w-1.5 h-1.5 rounded-full bg-zinc-100"></div>
            </div>
          </div>
          <div className="prose prose-zinc max-w-none">
             <h3 className="text-zinc-900 text-3xl font-bold tracking-tight mb-6 leading-[1.2]">The commoditization of insight.</h3>
             <p className="text-zinc-600 leading-relaxed italic border-l-4 border-green-600 pl-6 text-lg mb-8 bg-zinc-50/50 py-4 pr-4 rounded-r-xl">
                "AI is driving the marginal cost of a sentence to zero. When everyone can produce infinite words, the only thing that retains value is unique perspective."
             </p>
             <p className="text-zinc-500 leading-relaxed text-sm font-medium">
                Focus on 'earned secrets'. Most founders fail because they use AI to average out their personality. We use it to amplify the sharpest edges of their expertise.
             </p>
          </div>
        </div>

        {/* Output Side */}
        <div className="relative bg-zinc-50/50 rounded-3xl border border-zinc-100 p-8 flex flex-col shadow-inner">
           <div className="absolute top-6 right-6 z-20">
              <button className="bg-zinc-900 text-white text-[10px] font-black px-5 py-2.5 rounded-xl shadow-xl hover:bg-green-600 transition-all uppercase tracking-widest">Sync to Network</button>
           </div>
           
           <div className="animate-in fade-in zoom-in-95 duration-700 h-full flex flex-col">
              <label className="text-[9px] text-zinc-400 font-black mb-10 tracking-[0.3em] uppercase">GENERATED_PLATFORM_ASSET</label>
              
              <div className="flex-1">
                {activeTab === 'linkedin' && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 rounded-xl bg-white border border-zinc-200 shadow-sm"></div>
                      <div>
                        <div className="w-28 h-2.5 bg-zinc-200 rounded-md mb-2"></div>
                        <div className="w-20 h-1.5 bg-zinc-100 rounded-md"></div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="h-3.5 w-full bg-white border border-zinc-100 rounded-lg"></div>
                      <div className="h-3.5 w-full bg-white border border-zinc-100 rounded-lg"></div>
                      <div className="h-3.5 w-4/5 bg-white border border-zinc-100 rounded-lg"></div>
                      <div className="py-14 bg-white border-2 border-green-600/20 rounded-2xl flex flex-col items-center justify-center text-center px-10 relative overflow-hidden group shadow-sm">
                         <div className="absolute top-4 left-4 text-[9px] font-black text-green-600/30 uppercase tracking-widest">QUOTE_CARD</div>
                         <p className="text-green-700 font-bold text-xl leading-snug italic tracking-tight">
                           "The marginal cost of a sentence is zero. Your lived experience is your only leverage."
                         </p>
                      </div>
                      <div className="h-3.5 w-full bg-white border border-zinc-100 rounded-lg"></div>
                    </div>
                  </div>
                )}
                {activeTab === 'x-thread' && (
                  <div className="space-y-6">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex gap-5 bg-white border border-zinc-100 p-5 rounded-2xl shadow-sm">
                        <div className="flex flex-col items-center">
                           <div className="w-9 h-9 rounded-xl bg-zinc-50 border border-zinc-100 flex-shrink-0"></div>
                           <div className="w-px h-full bg-zinc-50 my-2"></div>
                        </div>
                        <div className="space-y-3 flex-1 pt-1">
                          <div className={`h-3 bg-zinc-50 rounded-md ${i === 1 ? 'w-full' : 'w-[90%]'}`}></div>
                          <div className={`h-3 bg-zinc-50 rounded-md ${i === 1 ? 'w-[85%]' : 'w-[70%]'}`}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 'editorial' && (
                  <div className="flex flex-col gap-6 h-full">
                    <div className="flex-1 bg-white rounded-3xl border border-zinc-200 p-10 flex flex-col justify-between shadow-sm relative overflow-hidden group">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full opacity-50"></div>
                       <span className="text-[10px] font-black text-zinc-300 tracking-[0.4em] uppercase">SLIDE_01 / CONCEPT</span>
                       <div className="max-w-md">
                          <h4 className="text-zinc-900 text-3xl font-bold mb-6 tracking-tight leading-tight">Earned Secrets vs. AI Averages.</h4>
                          <div className="h-1.5 w-16 bg-green-600 rounded-full mb-6"></div>
                          <p className="text-zinc-500 text-sm font-medium leading-relaxed">A visualization of the Post-AI expertise paradigm.</p>
                       </div>
                    </div>
                    <div className="flex gap-4 h-28">
                       <div className="flex-1 bg-white border border-zinc-200 rounded-2xl opacity-40 shadow-sm"></div>
                       <div className="flex-1 bg-white border border-zinc-200 rounded-2xl opacity-40 shadow-sm"></div>
                    </div>
                  </div>
                )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};