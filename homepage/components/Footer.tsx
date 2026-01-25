import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-zinc-100 pt-32 pb-16">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-16 mb-24">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-green-600 flex items-center justify-center rounded-xl shadow-lg shadow-green-600/20">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                   <path d="M16 3h5v5M4 20L20.2 3.8M21 21l-7.5-7.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="font-display font-bold text-2xl tracking-tighter text-zinc-900">Counterdraft</span>
            </div>
            <p className="text-zinc-500 text-lg max-w-sm leading-relaxed font-medium">
              The professional OS for thinkers. Built for the era of unique perspectives, not automated noise.
            </p>
          </div>
          
          <div>
            <h4 className="text-zinc-900 text-[11px] font-black mb-8 tracking-[0.2em] uppercase">Product</h4>
            <ul className="space-y-5 text-sm font-bold text-zinc-400">
              <li><a href="#" className="hover:text-green-600 transition-colors">The Brain</a></li>
              <li><a href="#" className="hover:text-green-600 transition-colors">Command Center</a></li>
              <li><a href="#" className="hover:text-green-600 transition-colors">Smart Studio</a></li>
              <li><a href="#" className="hover:text-green-600 transition-colors">Pricing</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-zinc-900 text-[11px] font-black mb-8 tracking-[0.2em] uppercase">Learning</h4>
            <ul className="space-y-5 text-sm font-bold text-zinc-400">
              <li><a href="#" className="hover:text-green-600 transition-colors">Manifesto</a></li>
              <li><a href="#" className="hover:text-green-600 transition-colors">Audit Guides</a></li>
              <li><a href="#" className="hover:text-green-600 transition-colors">IP Frameworks</a></li>
              <li><a href="#" className="hover:text-green-600 transition-colors">Case Library</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-zinc-900 text-[11px] font-black mb-8 tracking-[0.2em] uppercase">Company</h4>
            <ul className="space-y-5 text-sm font-bold text-zinc-400">
              <li><a href="#" className="hover:text-green-600 transition-colors">Philosophy</a></li>
              <li><a href="#" className="hover:text-green-600 transition-colors">X / Threads</a></li>
              <li><a href="#" className="hover:text-green-600 transition-colors">LinkedIn</a></li>
              <li><a href="#" className="hover:text-green-600 transition-colors">Changelog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-zinc-900 text-[11px] font-black mb-8 tracking-[0.2em] uppercase">Legal</h4>
            <ul className="space-y-5 text-sm font-bold text-zinc-400">
              <li><a href="#" className="hover:text-green-600 transition-colors">Privacy</a></li>
              <li><a href="#" className="hover:text-green-600 transition-colors">Terms</a></li>
              <li><a href="#" className="hover:text-green-600 transition-colors">Cookies</a></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between border-t border-zinc-100 pt-12 text-[10px] text-zinc-400 font-mono font-bold tracking-[0.2em] uppercase">
          <p>© 2025 Counterdraft Inc. — Strategy First.</p>
          <div className="flex gap-10 mt-6 md:mt-0">
             <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> System Operational</span>
             <span>Build_v4.1.2</span>
          </div>
        </div>
      </div>
    </footer>
  );
};