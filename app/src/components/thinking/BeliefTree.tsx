
import { Belief } from "@/types";
import { ArrowRight, ChevronRight, CornerDownRight, Leaf, GitCommit, Database } from "lucide-react";

interface BeliefTreeProps {
    roots: Belief[];
    pillars: Belief[];
    leafs: Belief[]; // core/emerging/overused can be leafs if they are not roots/pillars
}

export function BeliefTree({ roots, pillars, leafs }: BeliefTreeProps) {
    // 1. Organize into a Map if parentIds exist, else just group by type for V1 visuals
    // V1 Visual: Roots -> Pillars -> Others

    // Fallback: If no Roots exist, show empty state or education
    if (roots.length === 0 && pillars.length === 0) {
        return (
            <div className="p-8 border-2 border-dashed rounded-xl text-center bg-gray-50">
                <GitCommit className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Belief Hierarchy Yet</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                    Your beliefs are currently flat lists. To build authority, start linking them into a "Tree of Truth" (Root &rarr; Pillar &rarr; Leaf).
                </p>
                <button className="mt-4 text-sm font-medium text-blue-600 hover:underline">
                    Run Genealogy Analysis
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-4 bg-white rounded-xl border border-gray-100 shadow-sm min-h-[600px]">
            {/* Level 1: ROOTS */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-gray-400 uppercase">
                    <Database size={12} /> Root Beliefs (The Why)
                </div>
                {roots.map(root => (
                    <div key={root.id} className="relative pl-4 border-l-2 border-blue-500">
                        <div className="p-4 bg-blue-50/50 rounded-r-lg border border-blue-100 flex items-start gap-4">
                            <div className="flex-1">
                                <h4 className="font-serif text-lg font-medium text-blue-900">{root.statement}</h4>
                                <div className="flex items-center gap-2 mt-2 text-xs text-blue-700/60">
                                    <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded text-blue-800">ROOT</span>
                                    <span>#{root.tags?.[0] || 'untagged'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Level 2: PILLARS attached to this Root (mock logic for V1 if no parentId) */}
                        <div className="mt-4 ml-6 space-y-4">
                            {/* Filter pillars that match this root (via parentId or tag) - For V1 we just show all pillars under the first root/generic if unlinked */}
                            {pillars.filter(p => p.parentId === root.id || !p.parentId).map(pillar => (
                                <div key={pillar.id} className="relative">
                                    <div className="absolute -left-6 top-4 w-6 h-px bg-gray-300"></div>
                                    <div className="absolute -left-6 top-[-24px] w-px h-[40px] bg-gray-300"></div>

                                    <div className="p-3 bg-white border rounded-lg hover:shadow-md transition-shadow">
                                        <p className="font-medium text-gray-800">{pillar.statement}</p>
                                        <div className="mt-1 flex gap-2">
                                            <span className="text-[10px] uppercase font-bold text-gray-400">Pillar</span>
                                        </div>
                                    </div>

                                    {/* Level 3: LEAFS */}
                                    <div className="mt-3 ml-6 space-y-2">
                                        {leafs.filter(l => l.parentId === pillar.id || (l.tags?.some(t => pillar.tags?.includes(t)))).slice(0, 3).map(leaf => (
                                            <div key={leaf.id} className="flex items-center gap-2 text-sm text-gray-600">
                                                <CornerDownRight size={12} className="text-gray-300 flex-shrink-0" />
                                                <span className="truncate">{leaf.statement}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Unlinked Pillars/Leafs (Orphans) */}
            {roots.length === 0 && pillars.length > 0 && (
                <div className="space-y-4 pt-4">
                    <div className="text-xs font-bold text-gray-400">UNLINKED PILLARS</div>
                    {pillars.map(p => (
                        <div key={p.id} className="p-3 bg-gray-50 border rounded">{p.statement}</div>
                    ))}
                </div>
            )}
        </div>
    );
}
