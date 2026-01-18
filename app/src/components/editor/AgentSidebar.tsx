"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Bot, User, Wand2, X } from "lucide-react";

interface AgentSidebarProps {
    currentContent: string | null;
    beliefContext: string | null;
    onApplyParams: (refinedContent: string) => void;
}

interface Message {
    role: 'user' | 'agent';
    content: string;
    suggestion?: string; // If agent provides a refinment
}

export function AgentSidebar({ currentContent, beliefContext, onApplyParams }: AgentSidebarProps) {
    const [instruction, setInstruction] = useState("");
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleRefine = async (customInstruction?: string) => {
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

    if (!currentContent) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] p-8 text-center bg-gray-50/30">
                <Sparkles size={24} className="mb-2 opacity-20" />
                <p className="text-xs">Select a draft to chat with the AI.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white border-l border-gray-100">
            {/* Header - Ultra Minimal */}
            <div className="p-3 border-b border-gray-100 shrink-0 flex items-center justify-between bg-white text-[var(--text-muted)]">
                <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-[var(--accent)]" />
                    <span className="text-[10px] font-medium uppercase tracking-widest text-gray-400">Assistant</span>
                </div>
            </div>

            {/* Chat Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Empty State / Suggestions */}
                {messages.length === 0 && (
                    <div className="mt-8 space-y-4">
                        <div className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-[var(--accent)] flex items-center justify-center shrink-0">
                                <Bot size={14} className="text-white" />
                            </div>
                            <div className="text-sm text-[var(--text-primary)] leading-relaxed bg-gray-50 p-3 rounded-lg rounded-tl-none">
                                <p>I'm ready to help. What would you like to improve?</p>
                            </div>
                        </div>

                        <div className="pl-9 grid grid-cols-1 gap-2">
                            {["Make it punchier", "Fix grammar", "Shorten this section", "Change tone to casual"].map(action => (
                                <button
                                    key={action}
                                    onClick={() => handleRefine(action)}
                                    className="text-left px-3 py-2 bg-white border border-gray-200 rounded-md text-xs text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all flex items-center gap-2"
                                >
                                    <Wand2 size={12} className="opacity-50" />
                                    {action}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Message History */}
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        {msg.role === 'agent' && (
                            <div className="w-6 h-6 rounded-full bg-[var(--accent)] flex items-center justify-center shrink-0 mt-1">
                                <Bot size={14} className="text-white" />
                            </div>
                        )}
                        {msg.role === 'user' && (
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-1">
                                <User size={14} className="text-gray-500" />
                            </div>
                        )}

                        <div className={`max-w-[85%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                            <div className={`inline-block p-3 rounded-lg text-sm leading-relaxed ${msg.role === 'user'
                                ? 'bg-gray-100 text-[var(--text-primary)] rounded-tr-none'
                                : 'bg-white border border-gray-100 text-[var(--text-primary)] rounded-tl-none shadow-sm'
                                }`}>
                                {msg.role === 'user' ? (
                                    msg.content
                                ) : (
                                    <div className="space-y-2">
                                        {msg.content.split('\n').map((line, i) => {
                                            // Simple list item detection
                                            if (line.trim().startsWith('- ')) {
                                                return (
                                                    <div key={i} className="flex gap-2 ml-1">
                                                        <span className="text-[var(--accent)]">•</span>
                                                        <span>
                                                            {line.replace('- ', '').split(/\*\*(.*?)\*\*/g).map((part, j) =>
                                                                j % 2 === 1 ? <strong key={j} className="font-semibold text-gray-900">{part}</strong> : part
                                                            )}
                                                        </span>
                                                    </div>
                                                );
                                            }
                                            // Normal line with bold detection
                                            return (
                                                <p key={i} className={line.trim() === '' ? 'h-2' : ''}>
                                                    {line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
                                                        j % 2 === 1 ? <strong key={j} className="font-semibold text-gray-900">{part}</strong> : part
                                                    )}
                                                </p>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Refinement Card */}
                            {msg.suggestion && (
                                <div className="mt-2 bg-white border border-[var(--accent)]/30 rounded-lg p-3 shadow-sm text-left">
                                    <div className="text-[10px] uppercase tracking-wider text-[var(--accent)] font-medium mb-2 flex items-center gap-2">
                                        <Sparkles size={10} />
                                        Suggestion
                                    </div>
                                    <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap mb-3 font-sans">
                                        {msg.suggestion}
                                    </p>
                                    <button
                                        onClick={() => onApplyParams(msg.suggestion!)}
                                        className="w-full py-1.5 px-3 bg-[var(--accent)] text-white text-xs rounded hover:opacity-90 transition-opacity"
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
                        <div className="w-6 h-6 rounded-full bg-[var(--accent)] flex items-center justify-center shrink-0">
                            <Bot size={14} className="text-white" />
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg rounded-tl-none flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Sticky Input Area */}
            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                <div className="relative shadow-sm">
                    <textarea
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        placeholder="Refine draft..."
                        className="w-full pl-3 pr-10 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all resize-none h-[50px] leading-tight placeholder:text-gray-400"
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
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white rounded-lg disabled:opacity-30 transition-all"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
