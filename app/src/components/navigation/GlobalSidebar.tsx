"use client";

import { useState, useEffect } from "react";
import { Home, Brain, Compass, Book, Plus, Import, Settings, Zap, Network, Menu, X } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";

interface GlobalSidebarProps {
    activeSection: string;
    onNavigate: (section: string) => void;
    onNewDraft: () => void;
    onImport: () => void;
}

export function GlobalSidebar({ activeSection, onNavigate, onNewDraft, onImport }: GlobalSidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const navItems = [
        { id: 'pipeline', label: 'Command Center', icon: Home },
        { id: 'mind', label: 'Your Mind', icon: Brain },
        { id: 'explore', label: 'Explore', icon: Compass },
        { id: 'drafts', label: 'Library', icon: Book },
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
        <div className="relative h-full w-16 flex-none z-50">

            {/* Actual Sidebar: Positioned absolutely to expand FREELY over adjacent content */}
            <div
                className={`absolute top-0 left-0 h-full bg-slate-900 text-white flex flex-col border-r border-[#1a5f3a] shadow-2xl transition-[width] duration-300 ease-in-out font-sans overflow-hidden ${isCollapsed ? 'w-16' : 'w-64'}`}
                style={{ backgroundColor: '#154d2e' }}
                onMouseEnter={() => !isMobile && setIsCollapsed(false)}
                onMouseLeave={() => !isMobile && setIsCollapsed(true)}
            >
                {/* Brand */}
                <div className={`transition-all duration-300 ${isCollapsed ? 'p-4 pb-4' : 'p-6 pb-8'}`}>
                    <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
                        <div className="w-8 h-8 flex items-center justify-center shrink-0 transition-transform duration-300">
                            <img src="/brand/logo-icon.png" alt="Icon" className="w-full h-full object-contain" />
                        </div>
                        <div className={`transition-opacity duration-300 delay-100 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                            <img src="/brand/logo-text.png" alt="CounterDraft" className="h-5 w-auto brightness-0 invert opacity-90" />
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className={`flex-1 transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-4'} space-y-1 mt-6`}>
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className={`flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all overflow-hidden whitespace-nowrap group relative ${isCollapsed
                                ? 'w-10 h-10 p-0 justify-center mx-auto'
                                : 'w-full px-4'
                                } ${activeSection === item.id
                                    ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/20'
                                    : 'text-white/70 hover:text-white hover:bg-white/5'
                                }`}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <item.icon size={18} className={`shrink-0 transition-colors duration-200 ${activeSection === item.id ? 'text-white' : 'opacity-70 group-hover:opacity-100'}`} />
                            <span className={`transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 delay-75'}`}>
                                {item.label}
                            </span>
                        </button>
                    ))}
                </nav>

                {/* Footer / Settings */}
                <div className={`border-t border-emerald-900 transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-4'}`}>
                    <button
                        onClick={() => onNavigate('settings')}
                        className={`flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all overflow-hidden whitespace-nowrap ${isCollapsed
                            ? 'w-10 h-10 p-0 justify-center mx-auto'
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
                        <button className={`w-full mt-4 pt-4 border-t border-emerald-900 flex items-center gap-3 px-2 overflow-hidden whitespace-nowrap transition-all duration-300 hover:bg-white/5 rounded-lg cursor-pointer text-left group ${isCollapsed ? 'opacity-0 h-0 hidden' : 'opacity-100 h-auto delay-100'}`}>
                            <div className="w-8 h-8 rounded-full bg-white/20 ring-2 ring-white/10 shrink-0 flex items-center justify-center">
                                <span className="font-bold text-xs text-white">MV</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate group-hover:text-emerald-300 transition-colors">Sign Out</p>
                                <p className="text-xs text-white/60 truncate">Pro Plan</p>
                            </div>
                        </button>
                    </SignOutButton>
                </div>
            </div>
        </div>
    );
}
