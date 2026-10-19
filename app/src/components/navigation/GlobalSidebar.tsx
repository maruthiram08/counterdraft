"use client";

import { useState, useEffect } from "react";
import { Home, Brain, Compass, Book, Settings, PenTool } from "lucide-react";
import Image from "next/image";
import { SignOutButton } from "@clerk/nextjs";

interface GlobalSidebarProps {
    activeSection: string;
    onNavigate: (section: string) => void;
    onNewDraft: () => void;
    onImport: () => void;
}

export function GlobalSidebar({ activeSection, onNavigate }: GlobalSidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    const navItems = [
        { id: 'explore', label: 'Explore', icon: Compass },
        { id: 'pipeline', label: 'Command Center', icon: Home },
        { id: 'drafts', label: 'Your Post', icon: Book },
        { id: 'mind', label: 'Your Mind', icon: Brain },
        { id: 'style', label: 'Your Voice', icon: PenTool },
    ];

    // Responsive detection
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            const mobile = width < 768;
            const tablet = width >= 768 && width < 1024;

            setIsMobile(mobile);

            // Auto-collapse on tablet if not already
            if (tablet && !isCollapsed) {
                setIsCollapsed(true);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isCollapsed]);

    // Mobile: Return null - MobileBottomNav handles navigation
    if (isMobile) {
        return null;
    }

    // Desktop/Tablet Sidebar
    return (
        // Spacer Container: Maintains rigid layout width (w-16) so page content never shifts
        <div className="relative h-full w-[72px] flex-none z-50 bg-canvas">

            {/* Actual Sidebar: Positioned absolutely to expand FREELY over adjacent content */}
            <div
                className={`absolute top-0 left-0 h-full bg-canvas text-ink flex flex-col transition-[width,box-shadow] duration-300 ease-in-out font-sans overflow-hidden ${isCollapsed ? 'w-[72px] shadow-[inset_-1px_0_0_rgb(146_152_176/0.18)]' : 'w-64 shadow-float'}`}
                onMouseEnter={() => !isMobile && setIsCollapsed(false)}
                onMouseLeave={() => !isMobile && setIsCollapsed(true)}
            >
                {/* Brand */}
                <div className={`transition-all duration-300 ${isCollapsed ? 'p-4 pb-4' : 'p-6 pb-8'}`}>
                    <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
                        <div className="w-8 h-8 flex items-center justify-center shrink-0 transition-transform duration-300">
                            <Image src="/brand/logo-icon.png" alt="Icon" width={32} height={32} className="w-full h-full object-contain" />
                        </div>
                        <div className={`transition-opacity duration-300 delay-100 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                            <Image src="/brand/logo-text.png" alt="CounterDraft" width={200} height={40} className="h-10 w-auto opacity-90" />
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className={`flex-1 transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-4'} space-y-3 mt-6`}>
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className={`flex items-center gap-3 h-11 rounded-full text-sm font-medium transition-all overflow-hidden whitespace-nowrap group relative ${isCollapsed
                                ? 'w-11 p-0 justify-center mx-auto'
                                : 'w-full px-4'
                                } ${activeSection === item.id
                                    ? 'shadow-pressed text-ink'
                                    : 'text-ink-soft hover:text-ink hover:shadow-raised'
                                }`}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <item.icon size={18} className={`shrink-0 transition-colors duration-200 ${activeSection === item.id ? 'text-ember-500' : 'opacity-80 group-hover:opacity-100'}`} />
                            <span className={`transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 delay-75'}`}>
                                {item.label}
                            </span>
                        </button>
                    ))}
                </nav>

                {/* Footer / Settings */}
                <div className={`transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-4'}`}>
                    <button
                        onClick={() => onNavigate('settings')}
                        className={`flex items-center gap-3 h-11 rounded-full text-sm font-medium text-ink-soft hover:text-ink hover:shadow-raised transition-all overflow-hidden whitespace-nowrap ${isCollapsed
                            ? 'w-11 p-0 justify-center mx-auto'
                            : 'w-full px-4'
                            }`}
                        title={isCollapsed ? 'Settings' : undefined}
                    >
                        <Settings size={18} className="shrink-0" />
                        <span className={`transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 delay-75'}`}>
                            Settings
                        </span>
                    </button>

                    <SignOutButton>
                        <button className={`w-full mt-4 p-2 flex items-center gap-3 overflow-hidden whitespace-nowrap transition-all duration-300 shadow-raised active:shadow-pressed rounded-full cursor-pointer text-left group ${isCollapsed ? 'opacity-0 h-0 hidden' : 'opacity-100 h-auto delay-100'}`}>
                            <div className="w-9 h-9 rounded-full bg-ember-500 shrink-0 flex items-center justify-center">
                                <span className="font-semibold text-xs text-white">MV</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-ink truncate">Sign Out</p>
                                <p className="text-xs text-ink-muted truncate">Pro Plan</p>
                            </div>
                        </button>
                    </SignOutButton>
                </div>
            </div>
        </div>
    );
}
