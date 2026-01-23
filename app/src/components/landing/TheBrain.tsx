import React, { useState } from 'react';

export const TheBrain: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      title: "Identify Audience",
      desc: "Define the specific mind you're reaching.",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      title: "Extract Stance",
      desc: "Lock in your non-obvious perspective.",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    {
      title: "Semantic Audit",
      desc: "Pressure-test against the clichés.",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      )
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      {/* LEFT: Process Steps - Explicit Numbering & Action */}
      <div className="space-y-4">
        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-4 ml-1">Input Sequence</label>
        {steps.map((step, idx) => (
          <div
            key={idx}
            className={`p-6 rounded-2xl border transition-all duration-500 cursor-pointer relative ${activeStep === idx ? 'bg-white border-zinc-300 shadow-xl shadow-zinc-200/50' : 'bg-transparent border-zinc-100 hover:border-zinc-200'}`}
            onClick={() => setActiveStep(idx)}
          >
            {/* Active Arrow Connector */}
            <div className={`absolute -right-3 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-r border-t border-zinc-300 transform rotate-45 z-10 ${activeStep === idx ? 'block' : 'hidden'} lg:block hidden opacity-0 ${activeStep === idx ? 'lg:opacity-100' : ''}`} style={{ transition: 'opacity 0.3s' }}></div>

            <div className="flex gap-5">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black border transition-all flex-shrink-0 ${activeStep === idx ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-300 border-zinc-100'}`}>
                0{idx + 1}
              </div>
              <div>
                <h3 className={`font-bold text-lg mb-0.5 ${activeStep === idx ? 'text-zinc-900' : 'text-zinc-400'}`}>{step.title}</h3>
                <p className={`text-sm ${activeStep === idx ? 'text-zinc-500' : 'text-zinc-400'}`}>{step.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* RIGHT: Engine Output - Simulation */}
      <div>
        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-4 ml-1 text-center lg:text-left">Engine Output Logic</label>
        <div className="bg-white rounded-3xl p-8 border border-zinc-200 min-h-[500px] flex flex-col shadow-2xl shadow-zinc-100 relative overflow-hidden">
          <div className="flex items-center justify-between mb-10 border-b border-zinc-100 pb-6">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase font-black">ANALYSIS_ACTIVE</span>
            </div>
            <div className="flex gap-1.5">
              <div className="w-1 h-1 rounded-full bg-zinc-200"></div>
              <div className="w-1 h-1 rounded-full bg-zinc-200"></div>
              <div className="w-1 h-1 rounded-full bg-zinc-200"></div>
            </div>
          </div>

          <div className="flex-1">
            {activeStep === 0 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                <div>
                  <label className="text-[9px] uppercase text-zinc-400 mb-3 block font-black tracking-[0.2em]">Target Identification</label>
                  <div className="text-2xl font-bold text-zinc-900 border-b-2 border-green-600 pb-2 inline-block">Growth-Stage CTOs</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 bg-zinc-50 rounded-xl border border-zinc-100">
                    <span className="text-[9px] text-green-600 font-black block mb-2 uppercase tracking-[0.15em]">Core Desire</span>
                    <span className="text-sm text-zinc-600 font-medium">Strategic speed over debt.</span>
                  </div>
                  <div className="p-5 bg-zinc-50 rounded-xl border border-zinc-100">
                    <span className="text-[9px] text-blue-600 font-black block mb-2 uppercase tracking-[0.15em]">Emerging Conflict</span>
                    <span className="text-sm text-zinc-600 font-medium">AI-generated tech debt.</span>
                  </div>
                </div>
              </div>
            )}
            {activeStep === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                <label className="text-[9px] uppercase text-zinc-400 mb-3 block font-black tracking-[0.2em]">Locked Stance</label>
                <div className="p-8 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 text-xl font-medium leading-relaxed italic border-l-4 border-l-green-600">
                  "Technical debt isn't a bug; it's a feature of velocity. Most leaders fail by fixing the wrong debt at the wrong time."
                </div>
                <div className="flex gap-3 pt-2">
                  <span className="px-3 py-1 bg-green-50 border border-green-100 rounded-lg text-[9px] text-green-700 font-black uppercase tracking-widest">LOCKED</span>
                  <span className="px-3 py-1 bg-white border border-zinc-200 rounded-lg text-[9px] text-zinc-500 font-black uppercase tracking-widest">HIGH_CONFIDENCE</span>
                </div>
              </div>
            )}
            {activeStep === 2 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-4">
                <label className="text-[9px] uppercase text-zinc-400 mb-1 block font-black tracking-[0.2em]">Semantic Filter</label>
                <div className="space-y-2.5">
                  <div className="p-4 bg-green-50/30 border border-green-100 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-sm text-zinc-800 font-bold">"Strategic Velocity Framework"</span>
                    </div>
                    <span className="text-[9px] text-green-600 font-black uppercase tracking-widest">CORE</span>
                  </div>
                  <div className="p-4 bg-blue-50/30 border border-blue-100 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-sm text-zinc-700">"Post-AI Refactoring Crisis"</span>
                    </div>
                    <span className="text-[9px] text-blue-600 font-black uppercase tracking-widest">EMERGING</span>
                  </div>
                  <div className="p-4 bg-amber-50/30 border border-amber-100 rounded-xl opacity-60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <span className="text-sm text-zinc-500 line-through">"Innovative agile"</span>
                    </div>
                    <span className="text-[9px] text-amber-500 font-black uppercase tracking-widest">SLOP</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button className="w-full py-4 mt-10 bg-zinc-900 text-white rounded-xl text-sm font-bold shadow-xl hover:bg-green-600 transition-all flex items-center justify-center gap-2 group">
            Finalize Strategy
            <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
        </div>
      </div>
    </div>
  );
};