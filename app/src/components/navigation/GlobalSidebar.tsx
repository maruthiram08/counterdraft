"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatedIcon } from "@/components/icons/AnimatedIcon";
import { BookTextIcon, BrainIcon, CompassIcon, HomeIcon, PenToolIcon, SettingsIcon } from "@/components/icons/animated";
import Image from "next/image";
import { SignOutButton } from "@clerk/nextjs";

interface GlobalSidebarProps {
    activeSection: string;
    onNavigate: (section: string) => void;
    onNewDraft: () => void;
    onImport: () => void;
}

// Hover intent: a quick pass over the rail shouldn't open it.
const OPEN_DELAY_MS = 150;
const CLOSE_DELAY_MS = 100;

export function GlobalSidebar({ activeSection, onNavigate }: GlobalSidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const navItems = [
        { id: 'explore', label: 'Explore', icon: CompassIcon },
        { id: 'pipeline', label: 'Command Center', icon: HomeIcon },
        { id: 'drafts', label: 'Your Post', icon: BookTextIcon },
        { id: 'mind', label: 'Your Mind', icon: BrainIcon },
        { id: 'style', label: 'Your Voice', icon: PenToolIcon },
    ];

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => () => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
    }, []);

    const scheduleCollapsed = (collapsed: boolean) => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        hoverTimer.current = setTimeout(
            () => setIsCollapsed(collapsed),
            collapsed ? CLOSE_DELAY_MS : OPEN_DELAY_MS
        );
    };

    const navigate = (section: string) => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        setIsCollapsed(true);
        onNavigate(section);
    };

    // Mobile: Return null - MobileBottomNav handles navigation
    if (isMobile) {
        return null;
    }

    // Labels only fade; icons and padding never move, so nothing jumps while the rail widens.
    const labelClass = `transition-opacity duration-150 motion-reduce:transition-none ${isCollapsed ? 'opacity-0' : 'opacity-100 delay-75'}`;

    // Desktop/Tablet Sidebar
    return (
        // Spacer Container: Maintains rigid layout width so page content never shifts
        <div className="relative h-full w-[72px] flex-none z-50 bg-canvas">

            {/* Actual Sidebar: Positioned absolutely to expand over adjacent content */}
            <div
                className={`absolute top-0 left-0 h-full bg-canvas text-ink flex flex-col transition-[width,box-shadow] duration-200 ease-out motion-reduce:transition-none font-sans overflow-hidden ${isCollapsed ? 'w-[72px] shadow-[inset_-1px_0_0_rgb(146_152_176/0.18)]' : 'w-60 shadow-float'}`}
                onMouseEnter={() => scheduleCollapsed(false)}
                onMouseLeave={() => scheduleCollapsed(true)}
            >
                {/* Brand */}
                <div className="px-5 pt-5 pb-4">
                    <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
                        <div className="w-8 h-8 flex items-center justify-center shrink-0">
                            <Image src="/brand/logo-icon.png" alt="Icon" width={32} height={32} className="w-full h-full object-contain" />
                        </div>
                        <div className={labelClass}>
                            <Image src="/brand/logo-text.png" alt="CounterDraft" width={200} height={40} className="h-8 w-auto opacity-90" />
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3.5 space-y-3 mt-6">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => navigate(item.id)}
                            className={`flex items-center gap-3 w-full h-11 pl-[13px] pr-4 rounded-full text-sm font-medium transition-[color,box-shadow] duration-150 overflow-hidden whitespace-nowrap group ${activeSection === item.id
                                ? 'shadow-pressed text-ink'
                                : 'text-ink-soft hover:text-ink hover:shadow-raised'
                                }`}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <AnimatedIcon icon={item.icon} size={18} className={`shrink-0 transition-colors duration-150 ${activeSection === item.id ? 'text-ember-500' : 'opacity-80 group-hover:opacity-100'}`} />
                            <span className={labelClass}>{item.label}</span>
                        </button>
                    ))}
                </nav>

                {/* Footer / Settings */}
                <div className="px-3.5 pb-4 space-y-3">
                    <button
                        onClick={() => navigate('settings')}
                        className={`flex items-center gap-3 w-full h-11 pl-[13px] pr-4 rounded-full text-sm font-medium transition-[color,box-shadow] duration-150 overflow-hidden whitespace-nowrap ${activeSection === 'settings'
                            ? 'shadow-pressed text-ink'
                            : 'text-ink-soft hover:text-ink hover:shadow-raised'
                            }`}
                        title={isCollapsed ? 'Settings' : undefined}
                    >
                        <AnimatedIcon icon={SettingsIcon} size={18} className="shrink-0" />
                        <span className={labelClass}>Settings</span>
                    </button>

                    <SignOutButton>
                        <button
                            className="w-full h-11 pl-1 pr-3 flex items-center gap-3 overflow-hidden whitespace-nowrap rounded-full cursor-pointer text-left hover:shadow-raised active:shadow-pressed transition-shadow duration-150"
                            title={isCollapsed ? 'Sign out' : undefined}
                        >
                            <div className="w-9 h-9 rounded-full bg-ember-500 shrink-0 flex items-center justify-center">
                                <span className="font-semibold text-xs text-white">MV</span>
                            </div>
                            <div className={`flex-1 min-w-0 ${labelClass}`}>
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
