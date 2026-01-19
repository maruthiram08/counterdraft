"use client";

import { useState, useEffect } from "react";
import { Home, Brain, Compass, Book, Plus, Import, Settings, Zap, Network, Menu, X } from "lucide-react";

interface GlobalSidebarProps {
    activeSection: string;
    onNavigate: (section: string) => void;
    onNewDraft: () => void;
    onImport: () => void;
}

export function GlobalSidebar({ activeSection, onNavigate, onNewDraft, onImport }: GlobalSidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const navItems = [
        { id: 'pipeline', label: 'Command Center', icon: Home },
        { id: 'beliefs', label: 'Your Mind', icon: Brain },
        { id: 'tensions', label: 'Tensions', icon: Zap },
        { id: 'mindmap', label: 'Mind Map', icon: Network },
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

            // Auto-collapse on tablet
            if (tablet && !isCollapsed) {
                setIsCollapsed(true);
            } else if (width >= 1024 && isCollapsed) {
                setIsCollapsed(false);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleNavigate = (section: string) => {
        onNavigate(section);
        if (isMobile) setIsMobileMenuOpen(false);
    };

    // Mobile: Return null - MobileBottomNav handles navigation
    if (isMobile) {
        return null;
    }

    // Desktop/Tablet Sidebar
    return (
        <div className={`h-full bg-slate-900 text-white flex flex-col border-r border-slate-800 shrink-0 transition-all duration-300 font-sans ${isCollapsed ? 'w-16' : 'w-64'
            }`}>
            {/* Brand */}
            <div className={`p-4 ${isCollapsed ? 'pb-4' : 'p-6 pb-8'}`}>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center font-serif font-bold text-white shadow-lg shadow-indigo-500/20 shrink-0">
                        C
                    </div>
                    {!isCollapsed && (
                        <span className="font-serif text-lg tracking-tight font-medium text-slate-100">CounterDraft</span>
                    )}
                </div>
            </div>

            {/* Global Actions */}
            <div className={`${isCollapsed ? 'px-2' : 'px-4'} mb-6 space-y-2`}>
                <button
                    onClick={onNewDraft}
                    className={`${isCollapsed ? 'w-10 h-10 p-0 justify-center' : 'w-full py-2.5 px-4'} bg-white text-slate-900 rounded-lg font-medium text-sm hover:bg-slate-100 transition-colors flex items-center gap-2 shadow-sm`}
                    title={isCollapsed ? 'New Draft' : undefined}
                >
                    <Plus size={16} />
                    {!isCollapsed && 'New Draft'}
                </button>
                <button
                    onClick={onImport}
                    className={`${isCollapsed ? 'w-10 h-10 p-0 justify-center' : 'w-full py-2.5 px-4'} bg-slate-800 text-slate-300 rounded-lg font-medium text-sm hover:bg-slate-700 hover:text-white transition-all flex items-center gap-2 border border-slate-700/50`}
                    title={isCollapsed ? 'Import Source' : undefined}
                >
                    <Import size={16} />
                    {!isCollapsed && 'Import Source'}
                </button>
            </div>

            {/* Navigation */}
            <nav className={`flex-1 ${isCollapsed ? 'px-1' : 'px-2'} space-y-1`}>
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={`${isCollapsed ? 'w-10 h-10 p-0 justify-center mx-auto' : 'w-full px-4'} flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeSection === item.id
                            ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                            }`}
                        title={isCollapsed ? item.label : undefined}
                    >
                        <item.icon size={18} className={`shrink-0 ${activeSection === item.id ? 'text-indigo-400' : 'opacity-70'}`} />
                        {!isCollapsed && item.label}
                    </button>
                ))}
            </nav>

            {/* Footer / Settings */}
            <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-t border-slate-800`}>
                <button
                    onClick={() => onNavigate('settings')}
                    className={`${isCollapsed ? 'w-10 h-10 p-0 justify-center mx-auto' : 'w-full px-4'} flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all`}
                    title={isCollapsed ? 'Settings' : undefined}
                >
                    <Settings size={18} />
                    {!isCollapsed && 'Settings'}
                </button>
                {!isCollapsed && (
                    <div className="mt-4 pt-4 border-t border-slate-800/50 flex items-center gap-3 px-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 ring-2 ring-slate-800 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-200 truncate">MVSN Prasad</p>
                            <p className="text-xs text-slate-500 truncate">Pro Plan</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

