"use client";

import { useMemo, useState } from 'react';
import { Belief, Draft } from '@/types';
import { GitBranch, FileText, ChevronRight, Target, Sparkles, ChevronDown } from 'lucide-react';
import { Spinner } from "@/components/shared/Loading";

interface GenealogyTreeProps {
    beliefs: Belief[];
    drafts: Draft[];
    onSelectDraft?: (id: string) => void;
}

interface TreeNode {
    belief: Belief;
    children: TreeNode[];
    drafts: Draft[];
}

type DraftWithRoot = Draft & { rootBeliefId?: string; root_belief_id?: string };

export function GenealogyTree({ beliefs, drafts, onSelectDraft }: GenealogyTreeProps) {
    const [isBootstrapping, setIsBootstrapping] = useState(false);
    const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

    const toggleCollapse = (id: string) => {
        const next = new Set(collapsedNodes);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setCollapsedNodes(next);
    };

    // 1. Build the tree structure
    const tree = useMemo(() => {
        const rootNodes: TreeNode[] = [];
        const nodeMap = new Map<string, TreeNode>();

        // Create all nodes
        beliefs.forEach(b => {
            nodeMap.set(b.id, { belief: b, children: [], drafts: [] });
        });

        // Link children
        beliefs.forEach(b => {
            const node = nodeMap.get(b.id)!;
            if (b.parentId && nodeMap.has(b.parentId)) {
                nodeMap.get(b.parentId)!.children.push(node);
            } else {
                rootNodes.push(node);
            }
        });

        // Link drafts
        drafts.forEach((d: DraftWithRoot) => {
            const rootId = d.rootBeliefId || d.root_belief_id;
            if (rootId && nodeMap.has(rootId)) {
                nodeMap.get(rootId)!.drafts.push(d);
            }
        });

        return rootNodes;
    }, [beliefs, drafts]);

    const handleBootstrap = async () => {
        setIsBootstrapping(true);
        try {
            const res = await fetch('/api/brain/genealogy/bootstrap', { method: 'POST' });
            if (res.ok) {
                window.location.reload();
            }
        } catch (err) {
            console.error('Bootstrap failed:', err);
        } finally {
            setIsBootstrapping(false);
        }
    };

    const renderNode = (node: TreeNode, depth = 0) => {
        const isCollapsed = collapsedNodes.has(node.belief.id);
        const hasChildren = node.children.length > 0 || node.drafts.length > 0;

        return (
            <div key={node.belief.id} className="relative">
                {/* SVG Branch Line for Depth */}
                {depth > 0 && (
                    <div className="absolute left-[-18px] top-[-10px] w-[18px] h-[34px] pointer-events-none">
                        <svg width="18" height="34" className="text-line stroke-current fill-none">
                            <path d={`M 0 0 V 22 Q 0 22 18 22`} strokeWidth="1.5" />
                        </svg>
                    </div>
                )}

                <div className="space-y-2 mb-4">
                    <div
                        className={`group flex items-center gap-3 p-3 pr-4 rounded-tile bg-surface shadow-card hover:shadow-float transition-all cursor-pointer ${node.belief.parentId
                            ? ''
                            : 'font-medium'
                            }`}
                        onClick={() => hasChildren && toggleCollapse(node.belief.id)}
                    >
                        <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${node.belief.parentId ? 'bg-canvas shadow-well' : 'bg-ink text-white'}`}>
                            {node.belief.parentId ? <GitBranch size={14} className="text-ink-muted" /> : <Target size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-relaxed ${node.belief.parentId ? 'text-ink-soft' : 'text-ink'}`}>
                                {node.belief.statement}
                            </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            {node.belief.confidence && (
                                <span className="h-7 px-3 inline-flex items-center rounded-full bg-canvas shadow-well text-xs font-medium text-ink-soft">
                                    {Math.round(node.belief.confidence)}%
                                </span>
                            )}
                            {hasChildren && (
                                <div className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}>
                                    <ChevronDown size={14} className="text-ink-muted" />
                                </div>
                            )}
                        </div>
                    </div>

                    {!isCollapsed && (
                        <div className="ml-6 space-y-2 border-l border-line pl-4 py-1">
                            {/* Render Drafts */}
                            {node.drafts.map((draft) => (
                                <button
                                    key={draft.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectDraft?.(draft.id);
                                    }}
                                    className="flex items-center gap-3 w-full h-10 px-4 rounded-full bg-dusk-100 hover:shadow-raised active:shadow-pressed transition-all text-left group"
                                >
                                    <FileText size={14} className="text-dusk-500" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-dusk-700 truncate">
                                            {draft.belief_text || 'Untitled Draft'}
                                        </p>
                                    </div>
                                    <ChevronRight size={12} className="text-dusk-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            ))}

                            {/* Recursive children */}
                            {node.children.map((child) => renderNode(child, depth + 1))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink">Strategic Mind Map</h2>
                    <p className="text-base text-ink-soft mt-2">Visualize how your specific drafts branch from your foundational beliefs.</p>
                </div>
                <button
                    onClick={handleBootstrap}
                    disabled={isBootstrapping}
                    className="self-start md:self-auto flex items-center gap-2 h-10 px-4 rounded-full bg-ink text-white hover:bg-ink/90 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                    {isBootstrapping ? (
                        <>
                            <Spinner size={16} />
                            Mapping Your Mind...
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            Generate Mind Map
                        </>
                    )}
                </button>
            </div>

            <div className="space-y-6">
                {tree.length > 0 ? (
                    tree.map((root) => renderNode(root, 0))
                ) : (
                    <div className="text-center py-20 px-6 bg-canvas shadow-pressed rounded-card">
                        <div className="w-12 h-12 bg-canvas rounded-full flex items-center justify-center mx-auto mb-4 shadow-raised">
                            <GitBranch className="text-ember-500" />
                        </div>
                        <h3 className="text-ink text-[17px] font-medium tracking-[-0.01em] mb-1">Your Map is Empty</h3>
                        <p className="text-ink-soft text-sm max-w-xs mx-auto mb-6">
                            Upload your posts or add manual beliefs to start building your strategic hierarchy.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
