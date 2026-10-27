import React from 'react';

interface KanbanCard {
  title: string;
  category: string;
  tagColor: string;
  date: string;
}

interface KanbanColumnProps {
  title: string;
  count: number;
  color: string;
  cards: KanbanCard[];
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ title, count, color, cards }) => (
  <div className="flex-1 flex flex-col bg-canvas shadow-pressed rounded-card p-3">
    <div className="flex items-center justify-between mb-4 px-2 pt-1">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${color}`}></div>
        <h3 className="text-sm font-medium text-ink">{title}</h3>
      </div>
      <span className="w-8 h-8 rounded-full bg-canvas shadow-raised text-ink-soft text-xs font-medium flex items-center justify-center">{count}</span>
    </div>

    <div className="space-y-3 flex-1">
      {cards.map((card, idx) => (
        <div key={idx} className="group bg-surface p-5 rounded-tile shadow-card hover:shadow-float hover:-translate-y-0.5 transition-all duration-200 cursor-pointer relative overflow-hidden">
          {/* Hover Accent */}
          <div className="absolute left-0 top-5 bottom-5 w-1 rounded-full bg-ember-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

          <div className="flex justify-between items-start mb-3">
            <span className={`h-7 px-3 rounded-full text-xs font-medium flex items-center ${card.tagColor}`}>{card.category}</span>
            <svg className="w-4 h-4 text-ink-muted group-hover:text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
          </div>

          <h4 className="text-[15px] font-medium tracking-[-0.01em] text-ink mb-4 leading-snug group-hover:text-ember-700 transition-colors line-clamp-2">{card.title}</h4>

          <div className="flex items-center justify-between mt-auto pt-1">
            <span className="text-xs text-ink-muted">{card.date}</span>
          </div>
        </div>
      ))}

      {/* "Add New" Placeholder for the first column */}
      {title === "Ideas" && (
        <button className="w-full h-12 rounded-full bg-canvas shadow-raised text-ink text-sm font-medium hover:text-ember-600 active:shadow-pressed transition-all flex items-center justify-center gap-2 group">
          <div className="w-6 h-6 rounded-full bg-ember-500 text-white flex items-center justify-center">
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
      title: "Ideas",
      count: 12,
      color: "bg-ember-500",
      cards: [
        { title: "Why your LinkedIn posts aren't getting traction", category: "LinkedIn", tagColor: "bg-dusk-100 text-dusk-700", date: "2m ago" },
        { title: "5 lessons from my first year of freelancing", category: "Medium", tagColor: "bg-ember-100 text-ember-700", date: "4h ago" }
      ]
    },
    {
      title: "In Development",
      count: 3,
      color: "bg-sand-500",
      cards: [
        { title: "How I plan a week of posts in 30 minutes", category: "LinkedIn", tagColor: "bg-dusk-100 text-dusk-700", date: "1d ago" }
      ]
    },
    {
      title: "Drafts",
      count: 1,
      color: "bg-dusk-500",
      cards: [
        { title: "Client case study: B2B content that converts", category: "LinkedIn", tagColor: "bg-dusk-100 text-dusk-700", date: "2d ago" }
      ]
    },
    {
      title: "Posted",
      count: 84,
      color: "bg-ink",
      cards: [
        { title: "Finding your writing voice", category: "Instagram", tagColor: "bg-ink text-white", date: "Oct 24" }
      ]
    }
  ];

  return (
    <div className="bg-canvas rounded-card shadow-float overflow-hidden flex flex-col min-h-[600px] animate-fade-in-up">
      {/* App Header */}
      <div className="h-auto min-h-[4.5rem] flex flex-wrap items-center justify-between px-4 md:px-6 pt-4 pb-2 gap-4 shrink-0">
        <div className="flex items-center gap-4 md:gap-8">
          <div className="flex gap-2">
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-canvas shadow-raised"></div>
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-canvas shadow-raised"></div>
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-canvas shadow-raised"></div>
          </div>
          <div className="h-6 w-px bg-line hidden md:block"></div>
          <div className="flex items-center gap-2 text-ink text-lg md:text-xl font-medium tracking-[-0.02em]">
            <svg className="w-5 h-5 text-ember-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
            <span className="text-ink hidden sm:inline">Command Center</span>
            <span className="text-ink sm:hidden">CMD</span>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <button className="h-10 px-4 rounded-full bg-ember-500 text-white text-xs font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all flex items-center gap-2">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            New Idea
          </button>
        </div>
      </div>

      {/* Kanban Board - Responsive Grid */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 h-full">
          {columns.map((col, idx) => (
            <KanbanColumn key={idx} {...col} />
          ))}
        </div>
      </div>
    </div>
  );
};
