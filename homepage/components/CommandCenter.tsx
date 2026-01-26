import React from 'react';

interface KanbanColumnProps {
  title: string;
  cards: any[];
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ title, cards }) => (
  <div className="flex-1 min-w-[320px]">
    <div className="flex items-center justify-between mb-8 px-2 border-b border-zinc-100 pb-4">
      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">{title}</h3>
      <span className="text-[10px] bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded text-zinc-500 font-mono font-bold">{cards.length}</span>
    </div>
    <div className="space-y-5">
      {cards.map((card, idx) => (
        <div key={idx} className="bg-white p-7 rounded-2xl border border-zinc-200 hover:border-green-600/40 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.06)] transition-all cursor-pointer group relative overflow-hidden">
          <div className="text-[9px] text-green-600 mb-4 font-black uppercase tracking-[0.15em]">{card.category}</div>
          <h4 className="font-bold text-lg mb-6 group-hover:text-zinc-900 text-zinc-800 leading-[1.3]">{card.title}</h4>
          <div className="flex items-center justify-between pt-4 border-t border-zinc-50">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-[9px] text-zinc-500 font-black">JD</div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">James D.</span>
            </div>
            <div className="flex items-center gap-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
               <span className="text-[10px] text-zinc-300 font-mono">v4.1</span>
            </div>
          </div>
        </div>
      ))}
      <button className="w-full border-2 border-dashed border-zinc-100 rounded-2xl py-8 flex flex-col items-center justify-center text-zinc-300 hover:text-green-600 hover:border-green-600/30 hover:bg-green-50/50 transition-all group">
        <svg className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
        <span className="text-[10px] font-black uppercase tracking-widest">Create New Logic</span>
      </button>
    </div>
  </div>
);

export const CommandCenter: React.FC = () => {
  const data = [
    {
      title: "Incoming Ideas",
      cards: [
        { title: "The Anti-Influencer Playbook: Strategic silence in a noisy world.", category: "MANIFESTO" },
        { title: "GTM Bloodloss: Why Q3 projections are failing SaaS founders.", category: "STRATEGY" },
      ]
    },
    {
      title: "In Development",
      cards: [
        { title: "Refactoring the CTO: The move from coder to commercial leader.", category: "OP-ED" },
      ]
    },
    {
      title: "Active Drafts",
      cards: [
        { title: "Metaphors for Non-Technical Buyers: Bridging the complex gap.", category: "EDUCATION" },
        { title: "Scaling Thought Leadership: Content as an asset class.", category: "PLAYBOOK" },
      ]
    },
    {
      title: "Published / Live",
      cards: [
        { title: "The Antidote to AI Slop: A guide for modern expertise.", category: "GUIDE" },
      ]
    }
  ];

  return (
    <div className="relative">
      <div className="flex flex-nowrap gap-10 pb-12 overflow-x-auto scrollbar-hide relative z-10 px-2">
        {data.map((col, idx) => (
          <KanbanColumn key={idx} title={col.title} cards={col.cards} />
        ))}
      </div>
    </div>
  );
};