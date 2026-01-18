import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <Header />

      <main className="flex-1">
        {/* HERO Section - Dark */}
        <section className="bg-[var(--surface-dark)] text-[var(--text-on-dark)] py-24 md:py-32">
          <div className="container">
            <div className="max-w-4xl">
              <h1 className="text-5xl md:text-7xl font-semibold tracking-tight mb-8 leading-[1.1]">
                Know what you believe <br />
                <span className="text-[var(--text-on-dark-muted)]">before you write it.</span>
              </h1>

              <div className="flex flex-col sm:flex-row gap-4 mt-12">
                <Link href="/onboarding" className="btn btn-primary px-8 py-4 text-lg h-auto">
                  Start Thinking
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* THE PROBLEM - Provocative */}
        <section className="py-24 border-b border-[var(--border)]">
          <div className="container max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-medium mb-6">
              Most creators repeat themselves without realizing it.
            </h2>
            <p className="text-xl text-[var(--text-muted)] leading-relaxed">
              You publish every day, but are you saying anything new? <br />
              Without a map of your beliefs, you’re just making noise.
            </p>
          </div>
        </section>

        {/* WHAT COUNTERDRAFT DOES - Editorial Framing */}
        <section className="py-24 bg-[var(--surface-elevated)]">
          <div className="container">
            <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
              <div>
                <h3 className="text-xl font-semibold mb-3">Finds your beliefs</h3>
                <p className="text-[var(--text-muted)]">
                  Extracts the core axioms buried in your past writing.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3">Surfaces contradictions</h3>
                <p className="text-[var(--text-muted)]">
                  Highlights where you disagree with yourself so you can resolve it.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3">Directs your pen</h3>
                <p className="text-[var(--text-muted)]">
                  Tells you exactly what you <em>haven't</em> written yet.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SCREENSHOT PLACEHOLDER */}
        <section className="py-24 border-y border-[var(--border)] overflow-hidden">
          <div className="container">
            <div className="max-w-5xl mx-auto bg-[var(--surface)] border border-[var(--border)] rounded-xl aspect-[16/9] flex items-center justify-center shadow-lg">
              <p className="text-[var(--text-subtle)]">[ Interface Preview: Belief + Tension Card ]</p>
            </div>
            <p className="text-center text-sm text-[var(--text-muted)] mt-4">
              See where your thinking breaks.
            </p>
          </div>
        </section>

        {/* WHO THIS IS NOT FOR - Exclusionary */}
        <section className="py-24 bg-[#F3F4F6]"> {/* Slightly darker grey for contrast */}
          <div className="container max-w-3xl mx-auto">
            <h2 className="text-2xl font-semibold mb-8">Who this is NOT for</h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 opacity-60">
                <span className="text-red-500 text-xl">×</span>
                <p>If you want AI to write content for you, go elsewhere.</p>
              </li>
              <li className="flex items-start gap-3 opacity-60">
                <span className="text-red-500 text-xl">×</span>
                <p>If you prioritize viral hooks over depth, go elsewhere.</p>
              </li>
              <li className="flex items-start gap-3 opacity-60">
                <span className="text-red-500 text-xl">×</span>
                <p>If you want a "second brain" that just stores notes, use Notion.</p>
              </li>
            </ul>
            <p className="mt-8 font-medium">
              Counterdraft is for people who want to <span className="underline decoration-[var(--accent)] decoration-2 underline-offset-2">think harder</span>.
            </p>
          </div>
        </section>

        {/* CTA - Dark */}
        <section className="bg-[var(--surface-dark)] text-[var(--text-on-dark)] py-24 text-center">
          <div className="container max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-semibold mb-6">
              Ready to do the hard work?
            </h2>
            <div className="flex justify-center mt-8">
              <Link href="/onboarding" className="btn btn-primary px-8 py-4 text-lg h-auto">
                Begin Analysis
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
