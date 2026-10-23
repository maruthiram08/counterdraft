"use client";

import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { Device, LINKEDIN_MAX_CHARS, seeMoreCut } from "@/lib/editor/openings";

interface LinkedInPreviewProps {
    content: string;
}

// The post as it lands in the LinkedIn feed: what shows before "see more" on a phone and on desktop.
export function LinkedInPreview({ content }: LinkedInPreviewProps) {
    const [device, setDevice] = useState<Device>('phone');
    const [expanded, setExpanded] = useState(false);
    const text = content.trim();
    const cut = seeMoreCut(text, device);
    const overLimit = text.length > LINKEDIN_MAX_CHARS;

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div role="radiogroup" aria-label="Preview on" className="flex gap-1 p-1 rounded-full bg-canvas shadow-well">
                    {([['phone', 'Phone', Smartphone], ['desktop', 'Desktop', Monitor]] as const).map(([value, label, Icon]) => (
                        <button
                            key={value}
                            role="radio"
                            aria-checked={device === value}
                            onClick={() => { setDevice(value); setExpanded(false); }}
                            className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-all ${device === value ? 'bg-surface shadow-raised text-ember-600' : 'text-ink-muted hover:text-ink'}`}
                        >
                            <Icon size={12} /> {label}
                        </button>
                    ))}
                </div>
                <p className={`text-xs ${overLimit ? 'text-rose-700 font-medium' : 'text-ink-muted'}`}>
                    {text.length.toLocaleString()} / {LINKEDIN_MAX_CHARS.toLocaleString()} characters{overLimit ? ': over LinkedIn\'s limit' : ''}
                </p>
            </div>

            <div className={`mx-auto bg-white text-[#191919] rounded-xl border border-black/10 shadow-sm transition-all ${device === 'phone' ? 'max-w-[380px]' : 'max-w-[555px]'}`}>
                <div className="flex items-center gap-2.5 px-4 pt-3">
                    <div className="w-10 h-10 rounded-full bg-[#dbe7f2] flex items-center justify-center text-sm font-semibold text-[#0a66c2]" aria-hidden="true">Y</div>
                    <div className="leading-tight">
                        <p className="text-sm font-semibold">You</p>
                        <p className="text-xs text-black/60">Now</p>
                    </div>
                </div>
                <div className="px-4 py-3 text-sm leading-[1.45] whitespace-pre-wrap break-words" data-testid="linkedin-post">
                    {expanded || !cut.truncated ? text : cut.visible}
                    {cut.truncated && !expanded && (
                        <>
                            <span className="text-black/60">… </span>
                            <button onClick={() => setExpanded(true)} className="text-black/60 hover:text-[#0a66c2] hover:underline">see more</button>
                        </>
                    )}
                </div>
            </div>

            {cut.truncated && !expanded && (
                <p className="text-xs text-ink-muted text-center">
                    Readers see about {cut.visible.length} characters on {device === 'phone' ? 'a phone' : 'desktop'} before &ldquo;see more&rdquo;. Everything that makes them click has to be in there.
                </p>
            )}
        </div>
    );
}
