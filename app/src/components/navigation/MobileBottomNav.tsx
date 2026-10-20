"use client";

import { useState, useEffect } from "react";
import { Home, Compass, Book, Brain, MoreHorizontal, Zap, Settings, X, PenTool } from "lucide-react";

interface MobileBottomNavProps {
    activeSection: string;
    onNavigate: (section: string) => void;
}

export function MobileBottomNav({ activeSection, onNavigate }: MobileBottomNavProps) {
    const [isMobile, setIsMobile] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    // Only show on mobile
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!isMobile) return null;

    const primaryNavItems = [
        { id: 'explore', label: 'Explore', icon: Compass },
        { id: 'pipeline', label: 'Home', icon: Home },
        { id: 'drafts', label: 'Your Post', icon: Book },
        { id: 'mind', label: 'Mind', icon: Brain },
    ];

    const moreNavItems = [
        { id: 'style', label: 'Your Voice', icon: PenTool },
        { id: 'tensions', label: 'Tensions', icon: Zap },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    const handleNavigate = (section: string) => {
        onNavigate(section);
        setShowMoreMenu(false);
    };

    return (
        <>
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
                                    <item.icon size={22} className={activeSection === item.id ? 'text-ember-500' : 'text-ink-muted'} />
                                    {item.label}
                                </button>
                            ))}
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
                            <item.icon
                                size={20}
                                className={activeSection === item.id ? 'text-ember-500' : ''}
                                strokeWidth={activeSection === item.id ? 2.25 : 1.75}
                            />
                            <span className={`text-[10px] font-medium ${activeSection === item.id ? 'text-ink' : 'text-ink-muted'}`}>
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
                        <span className={`text-[10px] font-medium ${showMoreMenu || moreNavItems.some(i => i.id === activeSection) ? 'text-ink' : 'text-ink-muted'
                            }`}>
                            More
                        </span>
                    </button>
                </div>
            </nav>
        </>
    );
}
