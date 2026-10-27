"use client";

import { useState } from "react";
import { MessageSquare, MoreHorizontal, X } from "lucide-react";
import { OPEN_FEEDBACK_EVENT } from "@/components/shared/FloatingFeedbackButton";
import { AnimatedIcon } from "@/components/icons/AnimatedIcon";
import { BookTextIcon, BrainIcon, CompassIcon, HomeIcon, PenToolIcon, SettingsIcon, ZapIcon } from "@/components/icons/animated";

interface MobileBottomNavProps {
    activeSection: string;
    onNavigate: (section: string) => void;
}

export function MobileBottomNav({ activeSection, onNavigate }: MobileBottomNavProps) {
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    const primaryNavItems = [
        { id: 'explore', label: 'Explore', icon: CompassIcon },
        { id: 'pipeline', label: 'Home', icon: HomeIcon },
        { id: 'drafts', label: 'Your Post', icon: BookTextIcon },
        { id: 'mind', label: 'Mind', icon: BrainIcon },
    ];

    const moreNavItems = [
        { id: 'style', label: 'Your Voice', icon: PenToolIcon },
        { id: 'tensions', label: 'Tensions', icon: ZapIcon },
        { id: 'settings', label: 'Settings', icon: SettingsIcon },
    ];

    const handleNavigate = (section: string) => {
        onNavigate(section);
        setShowMoreMenu(false);
    };

    // Phones only (md:hidden). Hidden with CSS, not a width check, so it is in the
    // first paint instead of popping in after the page loads.
    return (
        <div className="md:hidden">
            {/* More Menu Overlay */}
            {showMoreMenu && (
                <div className="fixed inset-0 z-40 flex items-end justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
                        onClick={() => setShowMoreMenu(false)}
                    />

                    {/* Menu */}
                    <div className="relative w-full max-w-md mx-4 mb-28 bg-canvas rounded-card shadow-float overflow-hidden animate-in slide-in-from-bottom duration-200">
                        <div className="p-3 space-y-2">
                            {moreNavItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => handleNavigate(item.id)}
                                    className={`w-full flex items-center gap-3 px-4 h-12 rounded-full text-base font-medium transition-all ${activeSection === item.id
                                        ? 'shadow-pressed text-ink'
                                        : 'text-ink-soft hover:text-ink hover:shadow-raised'
                                        }`}
                                >
                                    <AnimatedIcon icon={item.icon} size={22} className={activeSection === item.id ? 'text-ember-500' : 'text-ink-muted'} />
                                    {item.label}
                                </button>
                            ))}
                            <button
                                onClick={() => {
                                    setShowMoreMenu(false);
                                    window.dispatchEvent(new Event(OPEN_FEEDBACK_EVENT));
                                }}
                                className="w-full flex items-center gap-3 px-4 h-12 rounded-full text-base font-medium transition-all text-ink-soft hover:text-ink hover:shadow-raised"
                            >
                                <MessageSquare size={22} strokeWidth={1.75} className="text-ink-muted" />
                                Send feedback
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-4 safe-area-pb pointer-events-none">
                <div className="pointer-events-auto mx-auto max-w-md flex items-center justify-around h-[72px] px-2 bg-canvas rounded-full shadow-float">
                    {primaryNavItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => handleNavigate(item.id)}
                            className={`flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-full transition-all active:shadow-pressed ${activeSection === item.id
                                ? 'shadow-pressed text-ink'
                                : 'text-ink-muted hover:text-ink'
                                }`}
                        >
                            {/* Touch has no hover, so the icon plays as its tab becomes active. */}
                            <AnimatedIcon
                                icon={item.icon}
                                size={20}
                                play={activeSection === item.id}
                                className={activeSection === item.id ? 'text-ember-500 [&_svg]:[stroke-width:2.25]' : '[&_svg]:[stroke-width:1.75]'}
                            />
                            <span className={`text-[11px] font-medium ${activeSection === item.id ? 'text-ink' : 'text-ink-muted'}`}>
                                {item.label}
                            </span>
                        </button>
                    ))}

                    {/* More Button */}
                    <button
                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                        className={`flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-full transition-all active:shadow-pressed ${showMoreMenu || moreNavItems.some(i => i.id === activeSection)
                            ? 'shadow-pressed text-ember-500'
                            : 'text-ink-muted hover:text-ink'
                            }`}
                    >
                        {showMoreMenu ? (
                            <X size={20} strokeWidth={2} />
                        ) : (
                            <MoreHorizontal
                                size={20}
                                strokeWidth={moreNavItems.some(i => i.id === activeSection) ? 2.25 : 1.75}
                            />
                        )}
                        <span className={`text-[11px] font-medium ${showMoreMenu || moreNavItems.some(i => i.id === activeSection) ? 'text-ink' : 'text-ink-muted'
                            }`}>
                            More
                        </span>
                    </button>
                </div>
            </nav>
        </div>
    );
}
