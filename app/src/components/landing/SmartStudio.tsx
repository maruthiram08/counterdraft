import React, { useState } from 'react';

export const SmartStudio: React.FC = () => {
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');

  return (
    <div className="bg-white rounded-3xl border border-zinc-200 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] overflow-hidden min-h-[580px] flex animate-fade-in-up">
      {/* Sidebar Navigation */}
      <div className="w-[280px] bg-zinc-50/50 border-r border-zinc-100 flex flex-col hidden sm:flex">
        <div className="p-6 border-b border-zinc-100">
          <h2 className="font-serif text-xl font-bold text-zinc-900">Repurpose</h2>
          <p className="text-xs text-zinc-500 mt-1">Transform content for social.</p>
        </div>

        <div className="p-4 space-y-6">
          <div>
            <div className="px-3 mb-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Strategy & Text</div>
            <div className="space-y-1">
              <button onClick={() => setSelectedPlatform('medium')} className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all ${selectedPlatform === 'medium' ? 'bg-white shadow-sm ring-1 ring-zinc-200' : 'hover:bg-zinc-100'}`}>
                <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>
                </div>
                <div>
                  <div className="text-sm font-bold text-zinc-900">Medium Article</div>
                  <div className="text-[10px] text-zinc-500">SEO-optimized</div>
                </div>
              </button>
              <button onClick={() => setSelectedPlatform('instagram')} className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all ${selectedPlatform === 'instagram' ? 'bg-white shadow-sm ring-1 ring-zinc-200' : 'hover:bg-zinc-100'}`}>
                <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01"></path><rect x="2" y="2" width="20" height="20" rx="5" ry="5" strokeWidth="2"></rect></svg>
                </div>
                <div>
                  <div className="text-sm font-bold text-zinc-900">Instagram</div>
                  <div className="text-[10px] text-zinc-500">Captions & Scripts</div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <div className="px-3 mb-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Visual Production</div>
            <div className="space-y-1">
              <button onClick={() => setSelectedPlatform('studio')} className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all ${selectedPlatform === 'studio' ? 'bg-white shadow-sm ring-1 ring-zinc-200' : 'hover:bg-zinc-100'}`}>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <div>
                  <div className="text-sm font-bold text-zinc-900">Smart Studio</div>
                  <div className="text-[10px] text-zinc-500">Ready-to-post Image</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white flex flex-col">
        {/* Form Header */}
        <div className="h-16 border-b border-zinc-100 flex items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-md bg-pink-50 text-pink-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01"></path><rect x="2" y="2" width="20" height="20" rx="5" ry="5" strokeWidth="2"></rect></svg>
            </div>
            <h2 className="font-bold text-zinc-900 text-lg">Instagram Strategy</h2>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-8 bg-zinc-50/30 flex-1 overflow-y-auto space-y-6">
          <div className="bg-white p-6 rounded-xl border border-zinc-100 shadow-sm">
            <label className="text-sm font-bold text-zinc-900 mb-4 block flex items-center gap-2">
              <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path></svg>
              Post Format
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div className="border-2 border-pink-500 bg-pink-50 rounded-xl p-4 cursor-pointer relative">
                <div className="absolute top-3 right-3 w-4 h-4 bg-pink-500 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <div className="font-bold text-sm text-pink-900 mb-1">Carousel Script</div>
                <div className="text-xs text-pink-700/70">Multi-slide breakdown</div>
              </div>
              <div className="border border-zinc-100 hover:border-zinc-200 rounded-xl p-4 cursor-pointer opacity-60">
                <div className="font-bold text-sm text-zinc-900 mb-1">Caption Only</div>
                <div className="text-xs text-zinc-500">Powerful hooks</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-zinc-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path></svg>
                Context Labels
              </label>
              <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-1 rounded-md font-bold tracking-wide flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
                AUTO-GEN
              </span>
            </div>
            <input type="text" value="Startup Advice, Tech Trends" className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700" readOnly />
          </div>

          <div className="flex justify-end pt-4">
            <button className="px-8 py-3 bg-zinc-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-black flex items-center gap-2 group">
              Create Carousel Draft
              <svg className="w-4 h-4 text-yellow-300 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};