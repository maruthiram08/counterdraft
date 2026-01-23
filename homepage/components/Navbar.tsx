import React from 'react';

interface NavbarProps {
  isScrolled: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ isScrolled }) => {
  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? 'bg-white/80 backdrop-blur-xl border-b border-zinc-100 py-3 shadow-sm' : 'bg-transparent py-8'}`}>
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 flex items-center justify-between">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="w-9 h-9 bg-green-600 flex items-center justify-center rounded-lg shadow-lg shadow-green-600/20 group-hover:scale-105 transition-transform">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
               <path d="M16 3h5v5M4 20L20.2 3.8M21 21l-7.5-7.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-display font-bold text-2xl tracking-tighter text-zinc-900">Counterdraft</span>
        </div>
        
        <div className="hidden lg:flex items-center gap-10">
          <a href="#the-brain" className="text-zinc-500 hover:text-green-600 transition-colors text-xs font-bold uppercase tracking-widest">The Brain</a>
          <a href="#command-center" className="text-zinc-500 hover:text-green-600 transition-colors text-xs font-bold uppercase tracking-widest">Pipeline</a>
          <a href="#smart-studio" className="text-zinc-500 hover:text-green-600 transition-colors text-xs font-bold uppercase tracking-widest">Studio</a>
          <a href="#" className="text-zinc-500 hover:text-green-600 transition-colors text-xs font-bold uppercase tracking-widest">Journal</a>
        </div>

        <div className="flex items-center gap-6">
          <button className="text-zinc-500 hover:text-zinc-900 transition-colors text-xs font-bold uppercase tracking-widest hidden sm:block">Log in</button>
          <button className="bg-zinc-900 text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-green-600 transition-all transform hover:scale-105 active:scale-95">
            Request Access
          </button>
        </div>
      </div>
    </nav>
  );
};