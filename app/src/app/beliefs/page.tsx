export default function BeliefsPage() {
    // TODO: Fetch beliefs from API
    const beliefs = {
        core: [
            { id: "1", statement: "Building in public creates accountability", type: "core" },
            { id: "2", statement: "Culture eats strategy for breakfast", type: "core" },
            { id: "3", statement: "Speed is a competitive advantage", type: "core" },
        ],
        overused: [
            { id: "4", statement: "Consistency beats intensity", type: "overused" },
        ],
        emerging: [
            { id: "5", statement: "Networks trump hierarchies", type: "emerging" },
        ],
    };

    return (
        <main className="min-h-screen bg-[var(--background)]">
            {/* Header */}
            <header className="border-b border-[var(--border)] bg-[var(--surface)]">
                <div className="container py-4 flex items-center justify-between">
                    <h1 className="text-xl font-medium tracking-tight">counterdraft</h1>
                    <nav className="flex items-center gap-6">
                        <a href="/beliefs" className="text-sm font-medium">Beliefs</a>
                        <a href="/tensions" className="text-sm text-[var(--text-muted)] hover:text-[var(--foreground)]">Tensions</a>
                        <a href="/ideas" className="text-sm text-[var(--text-muted)] hover:text-[var(--foreground)]">Ideas</a>
                    </nav>
                </div>
            </header>

            <div className="container py-12">
                <div className="max-w-2xl">
                    <h2 className="text-3xl font-serif mb-2">Your Belief Graph</h2>
                    <p className="text-[var(--text-muted)] mb-8">
                        These are the beliefs we extracted from your content.
                        Edit or confirm each one.
                    </p>

                    {/* Core Beliefs */}
                    <section className="mb-10">
                        <div className="flex items-center gap-2 mb-4">
                            <h3 className="text-lg font-medium">Core Beliefs</h3>
                            <span className="badge badge-core">{beliefs.core.length}</span>
                        </div>
                        <div className="space-y-3">
                            {beliefs.core.map((belief) => (
                                <div key={belief.id} className="card group">
                                    <div className="flex items-start justify-between gap-4">
                                        <p className="text-editorial">{belief.statement}</p>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="btn btn-secondary text-xs">Edit</button>
                                            <button className="btn btn-primary text-xs">Confirm</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Overused */}
                    <section className="mb-10">
                        <div className="flex items-center gap-2 mb-4">
                            <h3 className="text-lg font-medium">Overused Angles</h3>
                            <span className="badge badge-overused">{beliefs.overused.length}</span>
                        </div>
                        <p className="text-sm text-[var(--text-muted)] mb-4">
                            You&apos;ve said these too often. Consider fresh approaches.
                        </p>
                        <div className="space-y-3">
                            {beliefs.overused.map((belief) => (
                                <div key={belief.id} className="card border-[var(--belief-overused)] border-l-4">
                                    <p className="text-editorial">{belief.statement}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Emerging */}
                    <section className="mb-10">
                        <div className="flex items-center gap-2 mb-4">
                            <h3 className="text-lg font-medium">Emerging Thesis</h3>
                            <span className="badge badge-emerging">{beliefs.emerging.length}</span>
                        </div>
                        <p className="text-sm text-[var(--text-muted)] mb-4">
                            A new direction forming in your thinking.
                        </p>
                        <div className="space-y-3">
                            {beliefs.emerging.map((belief) => (
                                <div key={belief.id} className="card border-[var(--belief-emerging)] border-l-4">
                                    <p className="text-editorial">{belief.statement}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
