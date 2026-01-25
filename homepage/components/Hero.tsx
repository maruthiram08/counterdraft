import React from 'react';

export const Hero: React.FC = () => {
  return (
    <section className="relative pt-40 pb-24 md:pt-52 md:pb-40 px-4 hero-gradient overflow-hidden">
      <div className="max-w-7xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-green-50 border border-green-100 text-[11px] font-bold text-green-700 mb-10 tracking-[0.2em] uppercase animate-fade-in-up shadow-sm">
          EDITORIAL ENGINE 2.5
        </div>
        <h1 className="text-6xl md:text-[8rem] font-bold tracking-tighter mb-10 max-w-6xl mx-auto leading-[0.85] text-zinc-900 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          Write with <span className="text-green-600">conviction</span>, not a prompt.
        </h1>
        <p className="text-zinc-500 text-xl md:text-2xl max-w-2xl mx-auto mb-14 font-light leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          Escape the noise of generative slop. Counterdraft is the professional OS for thought leaders who care about nuance and strategic depth.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-28 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <button className="w-full sm:w-auto bg-green-600 text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-green-700 transition-all transform hover:scale-105 active:scale-95 shadow-xl shadow-green-600/20">
            Start Free Project
          </button>
          <button className="w-full sm:w-auto bg-white border border-zinc-200 text-zinc-900 px-10 py-5 rounded-xl font-bold text-lg hover:bg-zinc-50 transition-all">
            The Philosophy
          </button>
        </div>

        {/* Dashboard Preview Container */}
        <div className="relative mx-auto max-w-6xl px-4 md:px-0 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
           <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-4/5 h-48 bg-green-600/5 blur-[100px] rounded-full z-0 opacity-40"></div>
           <div className="bg-white rounded-3xl overflow-hidden border border-zinc-200 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] relative z-10 p-2 md:p-3">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 mb-2">
                 <div className="flex gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-100"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-100"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-100"></div>
                 </div>
                 <div className="text-[9px] text-zinc-400 font-mono tracking-widest uppercase flex items-center gap-3">
                   <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                   CONNECTED_BRAIN_INSTANCE.PRO
                 </div>
                 <div className="w-12"></div>
              </div>
              <div className="aspect-video bg-zinc-50 rounded-2xl overflow-hidden group border border-zinc-100">
                <img 
                  src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=1600&h=900" 
                  alt="Counterdraft Interface Preview" 
                  className="w-full h-full object-cover filter grayscale-50 opacity-80 group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-1000 ease-out scale-105 group-hover:scale-100"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="bg-white/90 backdrop-blur-md border border-white shadow-xl px-8 py-4 rounded-full text-zinc-900 text-sm font-bold tracking-widest uppercase">
                    Interactive Preview
                  </div>
                </div>
              </div>
           </div>
        </div>
      </div>
    </section>
  );
};