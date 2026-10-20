"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Bot, User, Wand2, Brain, Search, Check } from "lucide-react";
import { AnimatedIcon } from "@/components/icons/AnimatedIcon";
import { CopyIcon, SendIcon, SparklesIcon } from "@/components/icons/animated";
import { Belief } from "@/types";
import { LimitModal } from "../modal/LimitModal";

interface AgentSidebarProps {
    currentContent: string | null;
    beliefContext: string | null;
    onApplyParams: (refinedContent: string) => void;
    availableBeliefs?: Belief[];
}

interface Message {
    role: 'user' | 'agent';
    content: string;
    suggestion?: string; // If agent provides a refinment
}

type Tab = 'chat' | 'context';

export function AgentSidebar({ currentContent, beliefContext, onApplyParams, availableBeliefs = [] }: AgentSidebarProps) {
    const [activeTab, setActiveTab] = useState<Tab>('chat');

    // Chat State
    const [instruction, setInstruction] = useState("");
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Context State
    const [searchQuery, setSearchQuery] = useState("");
    const [copiedBeliefId, setCopiedBeliefId] = useState<string | null>(null);

    // Limit State
    const [limitModalOpen, setLimitModalOpen] = useState(false);
    const [limitState, setLimitState] = useState({ tier: 'free', usage: 0, limit: 0 });

    useEffect(() => {
        if (activeTab === 'chat') {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, activeTab]);

    const handleRefine = async (customInstruction?: string) => {
        // LIMIT CHECK
        try {
            const res = await fetch('/api/user/status');
            const data = await res.json();

            if (data.usage && !data.usage.is_allowed) {
                setLimitState({
                    tier: data.usage.tier,
                    usage: data.usage.count,
                    limit: data.usage.limit
                });
                setLimitModalOpen(true);
                return;
            }
        } catch (e) {
            console.error("Limit check failed", e);
        }

        const activeInstruction = customInstruction || instruction;
        if (!activeInstruction || !currentContent) return;

        // Add user message
        const userMsg: Message = { role: 'user', content: activeInstruction };
        setMessages(prev => [...prev, userMsg]);
        setInstruction("");
        setLoading(true);

        try {
            const res = await fetch('/api/refine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentContent,
                    instruction: activeInstruction,
                    beliefContext
                }),
            });

            const data = await res.json();

            if (data.refinedContent) {
                const agentMsg: Message = {
                    role: 'agent',
                    content: "Here is a suggested refinement:",
                    suggestion: data.refinedContent
                };
                setMessages(prev => [...prev, agentMsg]);
            } else {
                const agentMsg: Message = {
                    role: 'agent',
                    content: "I couldn't generate a refinement. Please try again."
                };
                setMessages(prev => [...prev, agentMsg]);
            }

        } catch (error) {
            console.error(error);
            const agentMsg: Message = {
                role: 'agent',
                content: "Something went wrong. Please try again."
            };
            setMessages(prev => [...prev, agentMsg]);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyBelief = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedBeliefId(id);
        setTimeout(() => setCopiedBeliefId(null), 2000);
    };

    const filteredBeliefs = availableBeliefs.filter(b =>
        b.statement.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.beliefType.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!currentContent) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-ink-muted p-8 text-center bg-canvas">
                <Sparkles size={24} className="mb-2 opacity-20" />
                <p className="text-sm">Select a draft to view context.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-canvas relative">
            {/* Header / Tabs */}
            <div className="flex items-center gap-1 mx-4 mt-4 ml-14 p-1 bg-canvas shadow-well rounded-full shrink-0">
                <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex-1 h-9 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all ${activeTab === 'chat'
                        ? 'bg-surface shadow-raised text-ink'
                        : 'text-ink-muted hover:text-ink'
                        }`}
                >
                    <AnimatedIcon icon={SparklesIcon} size={14} />
                    Assistant
                </button>
                <button
                    onClick={() => setActiveTab('context')}
                    className={`flex-1 h-9 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all ${activeTab === 'context'
                        ? 'bg-surface shadow-raised text-ink'
                        : 'text-ink-muted hover:text-ink'
                        }`}
                >
                    <Brain size={14} />
                    Your Mind
                </button>
            </div>

            {/* CHAT TAB */}
            <div className={`flex flex-col flex-1 min-h-0 ${activeTab === 'chat' ? 'flex' : 'hidden'}`}>
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {messages.length === 0 && (
                        <div className="mt-8 space-y-4">
                            <div className="flex gap-3">
                                <div className="w-7 h-7 rounded-full bg-ember-500 flex items-center justify-center shrink-0">
                                    <Bot size={14} className="text-white" />
                                </div>
                                <div className="text-sm text-ink-soft leading-relaxed bg-surface shadow-card px-4 py-3 rounded-tile rounded-tl-md">
                                    <p>I&apos;m ready to help. What would you like to improve?</p>
                                </div>
                            </div>

                            <div className="pl-9 grid grid-cols-1 gap-2">
                                {["Make it punchier", "Fix grammar", "Shorten this section", "Change tone to casual"].map(action => (
                                    <button
                                        key={action}
                                        onClick={() => handleRefine(action)}
                                        className="text-left h-9 px-4 rounded-full bg-canvas shadow-raised text-xs font-medium text-ink-soft hover:text-ember-600 active:shadow-pressed transition-all flex items-center gap-2"
                                    >
                                        <Wand2 size={12} className="text-ember-500" />
                                        {action}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            {msg.role === 'agent' && (
                                <div className="w-7 h-7 rounded-full bg-ember-500 flex items-center justify-center shrink-0 mt-1">
                                    <Bot size={14} className="text-white" />
                                </div>
                            )}
                            {msg.role === 'user' && (
                                <div className="w-7 h-7 rounded-full bg-canvas shadow-raised flex items-center justify-center shrink-0 mt-1">
                                    <User size={14} className="text-ink-soft" />
                                </div>
                            )}

                            <div className={`max-w-[85%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                                <div className={`inline-block px-4 py-3 rounded-tile text-sm leading-relaxed text-left ${msg.role === 'user'
                                    ? 'bg-ink text-white rounded-tr-md'
                                    : 'bg-surface text-ink-soft rounded-tl-md shadow-card'
                                    }`}>
                                    {msg.role === 'user' ? (
                                        msg.content
                                    ) : (
                                        <div className="space-y-2">
                                            {msg.content.split('\n').map((line, i) => {
                                                if (line.trim().startsWith('- ')) {
                                                    return (
                                                        <div key={i} className="flex gap-2 ml-1">
                                                            <span className="text-ember-500">•</span>
                                                            <span>
                                                                {line.replace('- ', '').split(/\*\*(.*?)\*\*/g).map((part, j) =>
                                                                    j % 2 === 1 ? <strong key={j} className="font-semibold text-ink">{part}</strong> : part
                                                                )}
                                                            </span>
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <p key={i} className={line.trim() === '' ? 'h-2' : ''}>
                                                        {line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
                                                            j % 2 === 1 ? <strong key={j} className="font-semibold text-ink">{part}</strong> : part
                                                        )}
                                                    </p>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {msg.suggestion && (
                                    <div className="mt-2 bg-surface ring-2 ring-ember-100 rounded-tile p-4 shadow-card text-left">
                                        <div className="text-xs text-ember-600 font-medium mb-2 flex items-center gap-2">
                                            <AnimatedIcon icon={SparklesIcon} size={10} />
                                            Suggestion
                                        </div>
                                        <p className="text-sm text-ink whitespace-pre-wrap mb-3 font-sans">
                                            {msg.suggestion}
                                        </p>
                                        <button
                                            onClick={() => onApplyParams(msg.suggestion!)}
                                            className="w-full h-10 px-4 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all"
                                        >
                                            Apply Correction
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="flex gap-3">
                            <div className="w-7 h-7 rounded-full bg-ember-500 flex items-center justify-center shrink-0">
                                <Bot size={14} className="text-white" />
                            </div>
                            <div className="bg-surface shadow-card px-4 py-3 rounded-tile rounded-tl-md flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-ink-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-ink-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 bg-ink-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-canvas shrink-0">
                    <div className="relative">
                        <textarea
                            value={instruction}
                            onChange={(e) => setInstruction(e.target.value)}
                            placeholder="Refine draft..."
                            className="w-full pl-4 pr-14 py-3 text-sm bg-canvas shadow-well rounded-2xl text-ink border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 transition-all resize-none h-[52px] leading-tight placeholder:text-ink-muted"
                            disabled={loading}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleRefine();
                                }
                            }}
                        />
                        <button
                            onClick={() => handleRefine()}
                            disabled={!instruction || loading}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center bg-ember-500 text-white hover:bg-ember-600 shadow-ember active:shadow-pressed disabled:opacity-30 transition-all"
                        >
                            <AnimatedIcon icon={SendIcon} size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* CONTEXT TAB */}
            <div className={`flex flex-col flex-1 min-h-0 ${activeTab === 'context' ? 'flex' : 'hidden'}`}>
                {/* Search */}
                <div className="p-4 shrink-0">
                    <div className="relative">
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
                        <input
                            type="text"
                            placeholder="Search your beliefs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-10 pl-10 pr-4 text-sm bg-canvas shadow-well rounded-full text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 transition-all"
                        />
                    </div>
                </div>

                {/* Belief List */}
                <div className="flex-1 overflow-y-auto px-4 pb-4 pt-1 space-y-3">
                    {filteredBeliefs.length === 0 ? (
                        <div className="text-center py-8 text-ink-muted">
                            <p className="text-sm">No beliefs found.</p>
                        </div>
                    ) : (
                        filteredBeliefs.map(belief => (
                            <div key={belief.id} className="bg-surface p-4 rounded-tile shadow-card hover:shadow-float transition-all group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`h-6 px-2.5 rounded-full text-[11px] font-medium capitalize flex items-center ${belief.beliefType === 'core' ? 'bg-dusk-100 text-dusk-700' :
                                        belief.beliefType === 'emerging' ? 'bg-ember-100 text-ember-700' :
                                            'bg-sand-100 text-sand-700'
                                        }`}>
                                        {belief.beliefType}
                                    </span>
                                    <button
                                        onClick={() => handleCopyBelief(belief.statement, belief.id)}
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-ink-muted hover:text-ember-600 active:shadow-pressed transition-all opacity-0 group-hover:opacity-100"
                                        title="Copy to clipboard"
                                    >
                                        {copiedBeliefId === belief.id ? <Check size={14} /> : <AnimatedIcon icon={CopyIcon} size={14} />}
                                    </button>
                                </div>
                                <p className="text-sm text-ink-soft leading-relaxed">
                                    {belief.statement}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Limit Modal */}
            <LimitModal
                isOpen={limitModalOpen}
                onClose={() => setLimitModalOpen(false)}
                tier={limitState.tier}
                usage={limitState.usage}
                limit={limitState.limit}
            />
        </div>
    );
}
