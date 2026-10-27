import React, { useState } from 'react';

export const SmartStudio: React.FC = () => {
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');

  return (
    <div className="bg-canvas rounded-card shadow-float overflow-hidden min-h-[580px] flex animate-fade-in-up">
      {/* Sidebar Navigation */}
      <div className="w-[280px] bg-canvas flex flex-col hidden sm:flex">
        <div className="p-6 pb-2">
          <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink">Repurpose</h2>
          <p className="text-sm text-ink-soft mt-1">Transform content for social.</p>
        </div>

        <div className="p-4 space-y-6">
          <div>
            <div className="px-3 mb-2 text-sm text-ink-muted">Strategy & Text</div>
            <div className="space-y-2">
              <button onClick={() => setSelectedPlatform('medium')} className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all ${selectedPlatform === 'medium' ? 'bg-canvas shadow-pressed' : 'hover:shadow-raised'}`}>
                <div className="w-8 h-8 rounded-full bg-canvas shadow-raised flex items-center justify-center text-ink-soft">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-ink">Medium Article</div>
                  <div className="text-xs text-ink-muted">With a cover image</div>
                </div>
              </button>
              <button onClick={() => setSelectedPlatform('instagram')} className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all ${selectedPlatform === 'instagram' ? 'bg-canvas shadow-pressed' : 'hover:shadow-raised'}`}>
                <div className="w-8 h-8 rounded-full bg-ember-100 text-ember-600 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01"></path><rect x="2" y="2" width="20" height="20" rx="5" ry="5" strokeWidth="2"></rect></svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-ink">Instagram</div>
                  <div className="text-xs text-ink-muted">Captions & Scripts</div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <div className="px-3 mb-2 text-sm text-ink-muted">Visual Production</div>
            <div className="space-y-2">
              <button onClick={() => setSelectedPlatform('studio')} className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all ${selectedPlatform === 'studio' ? 'bg-canvas shadow-pressed' : 'hover:shadow-raised'}`}>
                <div className="w-8 h-8 rounded-full bg-dusk-100 text-dusk-700 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-ink">Smart Studio</div>
                  <div className="text-xs text-ink-muted">Ready-to-post Image</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-canvas flex flex-col">
        {/* Form Header */}
        <div className="h-16 flex items-center justify-between px-8 pt-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-ember-100 text-ember-600 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01"></path><rect x="2" y="2" width="20" height="20" rx="5" ry="5" strokeWidth="2"></rect></svg>
            </div>
            <h2 className="font-medium tracking-[-0.02em] text-ink text-xl">Instagram Strategy</h2>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 md:p-8 pt-2 md:pt-2 flex-1 overflow-y-auto space-y-5">
          <div className="bg-surface p-6 rounded-tile shadow-card">
            <label className="text-sm font-medium text-ink mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path></svg>
              Post Format
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-ember-50 ring-2 ring-ember-500 rounded-tile p-4 cursor-pointer relative">
                <div className="absolute top-3 right-3 w-5 h-5 bg-ember-500 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <div className="font-medium text-sm text-ink mb-1">Carousel Script</div>
                <div className="text-xs text-ember-700">Multi-slide breakdown</div>
              </div>
              <div className="bg-canvas shadow-well rounded-tile p-4 cursor-pointer opacity-70">
                <div className="font-medium text-sm text-ink mb-1">Caption Only</div>
                <div className="text-xs text-ink-soft">Powerful hooks</div>
              </div>
            </div>
          </div>

          <div className="bg-surface p-6 rounded-tile shadow-card">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-ink flex items-center gap-2">
                <svg className="w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path></svg>
                Context Labels
              </label>
              <span className="h-7 px-3 text-xs bg-dusk-100 text-dusk-700 rounded-full font-medium flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
                AUTO-GEN
              </span>
            </div>
            <input type="text" value="Startup Advice, Tech Trends" className="w-full px-4 py-3 bg-canvas shadow-well border-0 rounded-2xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ember-200" readOnly />
          </div>

          <div className="flex justify-end pt-4">
            <button className="h-12 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all flex items-center gap-2 group">
              Create Carousel Draft
              <svg className="w-4 h-4 text-white group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};