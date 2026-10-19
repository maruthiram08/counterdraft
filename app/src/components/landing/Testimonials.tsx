import React from 'react';

const Testimonial = ({ quote, author, role }: { quote: string, author: string, role: string }) => (
  <div className="p-8 md:p-10 rounded-card bg-surface shadow-card flex flex-col group hover:shadow-float hover:-translate-y-0.5 transition-all duration-300">
    <div className="mb-8 flex gap-1.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} className="w-5 h-5 text-ember-500 fill-current" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
    <p className="text-ink text-2xl font-medium leading-snug mb-10 tracking-[-0.02em]">&quot;{quote}&quot;</p>
    <div className="mt-auto flex items-center gap-6">
      <div className="w-14 h-14 rounded-full bg-canvas shadow-well flex items-center justify-center text-ink-soft font-medium text-sm group-hover:bg-ember-100 group-hover:text-ember-700 group-hover:shadow-none transition-all duration-300">
        {author.split(' ').map(n => n[0]).join('')}
      </div>
      <div>
        <h4 className="font-medium tracking-[-0.01em] text-ink text-[17px]">{author}</h4>
        <p className="text-ink-muted text-sm">{role}</p>
      </div>
    </div>
  </div>
);

export const Testimonials: React.FC = () => {
  return (
    <section className="py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center mb-20">
        <div className="inline-flex items-center h-8 px-4 rounded-full bg-ember-100 text-ember-700 text-sm font-medium mb-6">
          Loved by creators
        </div>
        <h3 className="text-5xl md:text-7xl font-medium tracking-[-0.03em] leading-[1.05] text-ink">Writers trust Counterdraft.</h3>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Testimonial
          quote="Finally, a writing tool that doesn't make me sound like everyone else. It helps me find angles I never would have thought of."
          author="Maya Chen"
          role="Freelance Content Writer"
        />
        <Testimonial
          quote="I went from posting once a month to twice a week. Counterdraft removed my blank-page anxiety completely."
          author="David Okonkwo"
          role="Substack Author, 8k Subscribers"
        />
        <Testimonial
          quote="My LinkedIn posts used to sound generic. Now they actually sound like me—and the engagement proves it."
          author="Sarah Mitchell"
          role="B2B Marketing Consultant"
        />
      </div>
      <div className="mt-32 flex flex-wrap justify-center items-center gap-20 md:gap-28 opacity-20 grayscale text-ink hover:opacity-50 transition-all duration-1000 pointer-events-none">
        <span className="text-3xl font-black tracking-tighter uppercase italic">Wired</span>
        <span className="text-3xl font-black tracking-tighter uppercase">TheVerge</span>
        <span className="text-3xl font-black tracking-tighter uppercase italic">Forbes</span>
        <span className="text-3xl font-black tracking-tighter uppercase">Economist</span>
      </div>
    </section>
  );
};
