"use client";

import { useMemo, useState } from 'react';
import { Belief } from '@/types';
import { GitBranch, FileText, ChevronRight, Target, Sparkles, Loader2, ChevronDown } from 'lucide-react';

interface GenealogyTreeProps {
    beliefs: Belief[];
    drafts: any[];
    onSelectDraft?: (id: string) => void;
}

interface TreeNode {
    belief: Belief;
    children: TreeNode[];
    drafts: any[];
}

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
        drafts.forEach((d: any) => {
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

    const renderNode = (node: TreeNode, depth = 0, isLast = false) => {
        const isCollapsed = collapsedNodes.has(node.belief.id);
        const hasChildren = node.children.length > 0 || node.drafts.length > 0;

        return (
            <div key={node.belief.id} className="relative">
                {/* SVG Branch Line for Depth */}
                {depth > 0 && (
                    <div className="absolute left-[-18px] top-[-10px] w-[18px] h-[34px] pointer-events-none">
                        <svg width="18" height="34" className="text-gray-200 stroke-current fill-none">
                            <path d={`M 0 0 V 22 Q 0 22 18 22`} strokeWidth="1.5" />
                        </svg>
                    </div>
                )}

                <div className="space-y-2 mb-4">
                    <div
                        className={`group flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${node.belief.parentId
                            ? 'bg-white border-gray-100 hover:border-gray-300 shadow-sm'
                            : 'bg-white border-2 border-slate-200 hover:border-slate-400 font-bold'
                            }`}
                        onClick={() => hasChildren && toggleCollapse(node.belief.id)}
                    >
                        <div className={`p-1.5 rounded-lg ${node.belief.parentId ? 'bg-slate-50' : 'bg-slate-900 text-white'}`}>
                            {node.belief.parentId ? <GitBranch size={14} className="text-slate-400" /> : <Target size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-relaxed ${node.belief.parentId ? 'text-slate-600' : 'text-slate-900'}`}>
                                {node.belief.statement}
                            </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            {node.belief.confidence && (
                                <span className="text-[10px] font-mono text-slate-400">
                                    {Math.round(node.belief.confidence)}%
                                </span>
                            )}
                            {hasChildren && (
                                <div className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}>
                                    <ChevronDown size={14} className="text-slate-400" />
                                </div>
                            )}
                        </div>
                    </div>

                    {!isCollapsed && (
                        <div className="ml-6 space-y-2 border-l border-gray-100 pl-4 py-1">
                            {/* Render Drafts */}
                            {node.drafts.map((draft) => (
                                <button
                                    key={draft.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectDraft?.(draft.id);
                                    }}
                                    className="flex items-center gap-3 w-full p-2.5 rounded-lg bg-blue-50/30 border border-blue-100/50 hover:bg-blue-50 hover:border-blue-200 transition-all text-left group"
                                >
                                    <FileText size={14} className="text-blue-500" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-blue-900 truncate">
                                            {draft.hook || draft.belief_text || 'Untitled Draft'}
                                        </p>
                                    </div>
                                    <ChevronRight size={12} className="text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            ))}

                            {/* Recursive children */}
                            {node.children.map((child, i) => renderNode(child, depth + 1, i === node.children.length - 1))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 space-y-8 animate-fade-in max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
                <div>
                    <h2 className="text-xl font-serif text-gray-900">Strategic Mind Map</h2>
                    <p className="text-sm text-gray-500 mt-1">Visualize how your specific drafts branch from your foundational beliefs.</p>
                </div>
                <button
                    onClick={handleBootstrap}
                    disabled={isBootstrapping}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition shadow-sm disabled:opacity-50 text-sm font-medium"
                >
                    {isBootstrapping ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
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

            <div className="space-y-6 pt-4">
                {tree.length > 0 ? (
                    tree.map((root, i) => renderNode(root, 0, i === tree.length - 1))
                ) : (
                    <div className="text-center py-20 bg-gray-50/50 border border-dashed border-gray-200 rounded-3xl">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <GitBranch className="text-gray-300" />
                        </div>
                        <h3 className="text-slate-900 font-medium mb-1">Your Map is Empty</h3>
                        <p className="text-slate-500 text-sm max-w-xs mx-auto mb-6">
                            Upload your posts or add manual beliefs to start building your strategic hierarchy.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
