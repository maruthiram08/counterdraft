import React from 'react';

const Testimonial = ({ quote, author, role }: { quote: string, author: string, role: string }) => (
  <div className="p-12 rounded-[2.5rem] bg-white border border-zinc-200 flex flex-col group hover:border-green-600 transition-all duration-700 hover:shadow-2xl hover:shadow-zinc-200/50">
    <div className="mb-10 flex gap-1.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} className="w-5 h-5 text-green-600 fill-current" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
    <p className="text-zinc-900 text-2xl font-bold leading-snug mb-12 group-hover:text-black transition-colors tracking-tight">"{quote}"</p>
    <div className="mt-auto flex items-center gap-6">
      <div className="w-14 h-14 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-400 font-black text-xs group-hover:border-green-600 group-hover:bg-green-50 group-hover:text-green-600 transition-all duration-500">
        {author.split(' ').map(n => n[0]).join('')}
      </div>
      <div>
        <h4 className="font-bold text-zinc-900 text-lg">{author}</h4>
        <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.25em]">{role}</p>
      </div>
    </div>
  </div>
);

export const Testimonials: React.FC = () => {
  return (
    <section className="py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center mb-28">
        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-[11px] font-black text-zinc-500 mb-8 tracking-[0.3em] uppercase">
          LOVED BY CREATORS
        </div>
        <h3 className="text-5xl md:text-7xl font-bold tracking-tighter leading-tight text-zinc-900">Writers trust Counterdraft.</h3>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
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
      <div className="mt-32 flex flex-wrap justify-center items-center gap-20 md:gap-28 opacity-20 grayscale hover:opacity-50 transition-all duration-1000 pointer-events-none">
        <span className="text-3xl font-black tracking-tighter uppercase italic">Wired</span>
        <span className="text-3xl font-black tracking-tighter uppercase">TheVerge</span>
        <span className="text-3xl font-black tracking-tighter uppercase italic">Forbes</span>
        <span className="text-3xl font-black tracking-tighter uppercase">Economist</span>
      </div>
    </section>
  );
};