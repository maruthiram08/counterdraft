import React from 'react';

interface KanbanColumnProps {
  title: string;
  count: number;
  color: string;
  cards: any[];
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ title, count, color, cards }) => (
  <div className="flex-1 flex flex-col">
    <div className="flex items-center justify-between mb-6 px-1">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${color}`}></div>
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">{title}</h3>
      </div>
      <span className="text-[10px] bg-zinc-100/80 text-zinc-500 font-bold px-2 py-1 rounded-md min-w-[20px] text-center">{count}</span>
    </div>

    <div className="space-y-4 flex-1">
      {cards.map((card, idx) => (
        <div key={idx} className="group bg-white p-5 rounded-2xl border border-zinc-200/60 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.06)] hover:border-green-600/30 transition-all duration-300 cursor-pointer relative overflow-hidden">
          {/* Hover Accent */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>

          <div className="flex justify-between items-start mb-3">
            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${card.tagColor} border border-opacity-10`}>{card.category}</span>
            <svg className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
          </div>

          <h4 className="text-sm font-bold text-zinc-800 mb-4 leading-snug group-hover:text-green-700 transition-colors line-clamp-2">{card.title}</h4>

          <div className="flex items-center justify-between mt-auto pt-3 border-t border-dashed border-zinc-100">
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full border-2 border-white bg-zinc-100 flex items-center justify-center text-[8px] font-black text-zinc-400">JD</div>
            </div>
            <span className="text-[10px] font-medium text-zinc-400">{card.date}</span>
          </div>
        </div>
      ))}

      {/* "Add New" Placeholder for the first column */}
      {title === "IDEAS" && (
        <button className="w-full py-4 border border-dashed border-zinc-200 rounded-2xl text-zinc-400 text-xs font-bold hover:bg-zinc-50 hover:text-zinc-600 hover:border-zinc-300 transition-all flex items-center justify-center gap-2 group">
          <div className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center group-hover:bg-zinc-200">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          </div>
          Capture Insight
        </button>
      )}
    </div>
  </div>
);

export const CommandCenter: React.FC = () => {
  const columns = [
    {
      title: "IDEAS",
      count: 12,
      color: "bg-zinc-300",
      cards: [
        { title: "The Anti-Influencer Playbook: Strategic silence.", category: "Manifesto", tagColor: "bg-purple-50 text-purple-700 border-purple-100", date: "2m ago" },
        { title: "GTM Bloodloss: Why Q3 projections fail.", category: "Strategy", tagColor: "bg-blue-50 text-blue-700 border-blue-100", date: "4h ago" }
      ]
    },
    {
      title: "DRAFTING",
      count: 3,
      color: "bg-amber-400",
      cards: [
        { title: "Refactoring the CTO: From coder to leader.", category: "Essay", tagColor: "bg-amber-50 text-amber-700 border-amber-100", date: "1d ago" }
      ]
    },
    {
      title: "REVIEW",
      count: 1,
      color: "bg-green-500",
      cards: [
        { title: "Metaphors for Non-Technical Buyers.", category: "Guide", tagColor: "bg-green-50 text-green-700 border-green-100", date: "2d ago" }
      ]
    },
    {
      title: "PUBLISHED",
      count: 84,
      color: "bg-zinc-800",
      cards: [
        { title: "The Antidote to AI Slop: A guide for experts.", category: "Playbook", tagColor: "bg-zinc-100 text-zinc-600 border-zinc-200", date: "Oct 24" }
      ]
    }
  ];

  return (
    <div className="bg-zinc-50/50 rounded-3xl border border-zinc-200 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col min-h-[600px] animate-fade-in-up">
      {/* App Header */}
      <div className="h-auto min-h-[4rem] bg-white border-b border-zinc-100 flex flex-wrap items-center justify-between px-4 md:px-6 py-2 gap-4 shrink-0">
        <div className="flex items-center gap-4 md:gap-8">
          <div className="flex gap-2">
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-400"></div>
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-amber-400"></div>
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-400"></div>
          </div>
          <div className="h-6 w-px bg-zinc-100 hidden md:block"></div>
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-widest">
            <svg className="w-4 h-4 text-zinc-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
            <span className="text-zinc-900 hidden sm:inline">Command Center</span>
            <span className="text-zinc-900 sm:hidden">CMD</span>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <button className="text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors hidden sm:block">Filter View</button>
          <button className="bg-zinc-900 text-white text-[10px] md:text-xs font-bold px-3 py-2 md:px-4 md:py-2 rounded-lg hover:bg-black transition-colors flex items-center gap-2">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            New Logic
          </button>
        </div>
      </div>

      {/* Kanban Board - Responsive Grid */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full">
          {columns.map((col, idx) => (
            <KanbanColumn key={idx} {...col} />
          ))}
        </div>
      </div>
    </div>
  );
};